"""Local-only preview and DeepSeek proxy. The API key stays on this computer."""
import http.server, json, os, pathlib, re, urllib.request, urllib.error

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'dist'
SETTINGS = pathlib.Path(os.environ.get('ZAOHUA_SETTINGS_PATH') or pathlib.Path.home() / '.gemini/antigravity/scratch/mangpai-bazi-agent/data/settings.json')
BRIEFS = ROOT.parent / 'references/ziwei-doushu/lib/seo/knowledge.ts'

def source_briefs(chart):
    """Retrieve upstream short descriptions only for major stars actually in the natal 命宫."""
    palaces=chart.get('palaces',[])
    if not isinstance(palaces,list): return []
    ming=next((p for p in palaces if isinstance(p,dict) and p.get('name')=='命宫'),None)
    if not ming or not isinstance(ming.get('stars'),list): return []
    try:
        source=BRIEFS.read_text(encoding='utf-8').split('export const STAR_BRIEF_SEO:',1)[1]
    except (OSError,IndexError): return []
    table=dict(re.findall(r"'([^']+)'\s*:\s*'([^']*)'",source))
    return [{'star':s['name'],'summary':table[s['name']]} for s in ming['stars']
            if isinstance(s,dict) and s.get('type')=='major' and s.get('name') in table]

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.path == '/assistant-config.js':
            body=b"window.WZBZAssistantEndpoint='/api/ziwei-assistant';"
            self.send_response(200); self.send_header('Content-Type','application/javascript'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body); return
        return super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def send_json(self, status, data):
        body=json.dumps(data,ensure_ascii=False).encode('utf-8')
        self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
    def do_POST(self):
        if self.path != '/api/ziwei-assistant': return self.send_json(404,{'error':'接口不存在'})
        origin=self.headers.get('Origin','')
        if origin not in ('http://localhost:9988','http://127.0.0.1:9988'):
            return self.send_json(403,{'error':'请求来源不受支持'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>64000: return self.send_json(400,{'error':'请求内容过长'})
            body=json.loads(self.rfile.read(length)); question=str(body.get('question','')).strip()
            chart=body.get('chart')
            if not question or len(question)>1000 or not isinstance(chart,dict):
                return self.send_json(400,{'error':'请填写问题并确认命盘'})
            settings=json.loads(SETTINGS.read_text(encoding='utf-8'))
            if settings.get('api_provider')!='deepseek' or not settings.get('api_key'):
                return self.send_json(503,{'error':'请先配置 DeepSeek 密钥'})
            system=('你是紫微斗数助手。只能依据用户提供的结构化命盘讨论，不得自行推算、编造星曜或宫位。'
                    '请先给简洁结论，再说明用到的宫位、星曜及所选运限；资料不足时明确说明。'
                    '解释属于传统命理分析，不作医疗、法律或投资决定。禁止编造引用来源。')
            history=body.get('history',[])
            if not isinstance(history,list): history=[]
            history=[{'role':x['role'],'content':x['content'][:4000]} for x in history[-8:]
                     if isinstance(x,dict) and x.get('role') in ('user','assistant') and isinstance(x.get('content'),str)]
            briefs=source_briefs(chart)
            reference=('\n命宫主星传统简介（仅为参考，不是完整断语，来源 Renhuai123/ziwei-doushu 的 STAR_BRIEF_SEO）：'+json.dumps(briefs,ensure_ascii=False)) if briefs else ''
            payload={'model':settings.get('model_name') or 'deepseek-chat','messages':[
                {'role':'system','content':system}, *history,
                {'role':'user','content':'当前命盘数据：'+json.dumps(chart,ensure_ascii=False)+reference+'\n问题：'+question}],
                'max_tokens':1200,'stream':False}
            request=urllib.request.Request('https://api.deepseek.com/chat/completions',
                data=json.dumps(payload,ensure_ascii=False).encode('utf-8'),
                headers={'Content-Type':'application/json','Authorization':'Bearer '+settings['api_key']})
            with urllib.request.urlopen(request,timeout=60) as response: result=json.load(response)
            answer=result['choices'][0]['message'].get('content')
            if not isinstance(answer,str) or not answer.strip(): return self.send_json(502,{'error':'助手未返回文字，请重试'})
            self.send_json(200,{'answer':answer})
        except urllib.error.HTTPError as error:
            self.send_json(502,{'error':'DeepSeek 验证失败，请检查密钥' if error.code==401 else 'DeepSeek 服务暂不可用（'+str(error.code)+'）'})
        except (OSError, ValueError, KeyError, IndexError, TypeError):
            self.send_json(503,{'error':'助手服务暂不可用，请检查本地配置和网络'})
    def log_message(self, fmt, *args):
        pass

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1',9988),Handler).serve_forever()
