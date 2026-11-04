import {afterEach,expect,it,vi} from 'vitest'
import {quizRequest} from '../src/party/quizClient'
afterEach(()=>vi.unstubAllGlobals())
it.each([
 ['budget_exhausted','额度已用完'],
 ['rate_limited','本分钟请求较多'],
 ['store_unavailable','服务暂不可用'],
 ['disabled','配置不可用'],
 ['model_unavailable','服务暂不可用'],
])('shows distinct and truthful %s feedback',async(code,message)=>{
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,json:async()=>({error:code})})))
 await expect(quizRequest('question',{})).rejects.toThrow(message)
 if(code!=='budget_exhausted') await expect(quizRequest('question',{})).rejects.not.toThrow('额度已用完')
})
it('does not label transport failures as exhausted budget or retry them',async()=>{
 const fetcher=vi.fn().mockRejectedValue(new TypeError('Network unavailable'));vi.stubGlobal('fetch',fetcher)
 await expect(quizRequest('question',{})).rejects.not.toThrow('额度已用完')
 expect(fetcher).toHaveBeenCalledTimes(1)
})
