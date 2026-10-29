import json, pathlib, urllib.request, urllib.error
settings = pathlib.Path(r'C:\Users\28257\.gemini\antigravity\scratch\mangpai-bazi-agent\data\settings.json')
config = json.loads(settings.read_text(encoding='utf-8'))
request = urllib.request.Request('https://api.deepseek.com/chat/completions',
 data=json.dumps({'model':config['model_name'],'messages':[{'role':'user','content':'Reply OK'}],'max_tokens':30}).encode(),
 headers={'Authorization':'Bearer '+config['api_key'],'Content-Type':'application/json'})
try:
 with urllib.request.urlopen(request,timeout=30) as response:
  result=json.load(response)
  print('Status:',response.status,'model:',result.get('model'),'response:',result['choices'][0]['message'].get('content'))
except urllib.error.HTTPError as error:
 print('DeepSeek HTTP status:',error.code)
except Exception as error:
 print('DeepSeek connection error:',type(error).__name__,str(error))
