import importlib.util, io, json, pathlib, threading, unittest, urllib.request, urllib.error
from unittest.mock import patch

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('devserver',ROOT/'scripts/dev-server.py')
server=importlib.util.module_from_spec(spec); spec.loader.exec_module(server)

class AssistantProxyTest(unittest.TestCase):
 def test_retrieves_only_actual_natal_major_stars(self):
  chart={'palaces':[{'name':'命宫','stars':[{'name':'紫微','type':'major'},{'name':'天机','type':'minor'}]},
                    {'name':'财帛','stars':[{'name':'天机','type':'major'}]}]}
  result=server.source_briefs(chart)
  self.assertEqual([item['star'] for item in result],['紫微'])
  self.assertTrue(result[0]['summary'])
 def test_request_forwards_chart_and_history_without_leaking_key(self):
  fake_settings={'api_provider':'deepseek','api_key':'test-secret','model_name':'fake-model'}
  seen={}
  class Response(io.BytesIO):
   def __enter__(self): return self
   def __exit__(self,*args): self.close()
  def fake_open(request,timeout):
   seen['url']=request.full_url; seen['data']=json.loads(request.data); seen['auth']=request.get_header('Authorization')
   return Response(json.dumps({'choices':[{'message':{'content':'已读取命宫'}}]}).encode())
  http=server.http.server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
  thread=threading.Thread(target=http.serve_forever,daemon=True); thread.start()
  try:
   with patch.object(server.SETTINGS.__class__,'read_text',return_value=json.dumps(fake_settings)),patch.object(server.urllib.request,'urlopen',side_effect=fake_open):
    conn=server.http.client.HTTPConnection('127.0.0.1',http.server_port)
    body=json.dumps({'question':'命宫','chart':{'palaces':[{'name':'命宫'}]},'history':[{'role':'user','content':'你好'}]}).encode()
    conn.request('POST','/api/ziwei-assistant',body,{'Origin':'http://localhost:9988','Content-Type':'application/json'})
    result=conn.getresponse(); payload=json.loads(result.read()); self.assertEqual(result.status,200)
    self.assertEqual(payload,{'answer':'已读取命宫'});self.assertNotIn('secret',json.dumps(payload))
    self.assertEqual(seen['url'],'https://api.deepseek.com/chat/completions');self.assertEqual(seen['auth'],'Bearer test-secret')
    self.assertIn('命宫',seen['data']['messages'][-1]['content']);self.assertEqual(seen['data']['messages'][1]['content'],'你好')
    conn.close()
   conn=server.http.client.HTTPConnection('127.0.0.1',http.server_port)
   conn.request('POST','/api/ziwei-assistant',b'{}',{'Origin':'https://unrelated.example'})
   response=conn.getresponse();response.read();self.assertEqual(response.status,403);conn.close()
  finally: http.shutdown();http.server_close();thread.join()

if __name__=='__main__': unittest.main()
