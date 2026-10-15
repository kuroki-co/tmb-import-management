import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callFriFunction } from './functions';
const {getSession}=vi.hoisted(()=>({getSession:vi.fn()}));
vi.mock('./browser',()=>({createClient:()=>({auth:{getSession}})}));
beforeEach(()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://test.supabase.co');
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');
 vi.stubGlobal('fetch',vi.fn());getSession.mockReset();
});
describe('Transporte privado Supabase',()=>{
 it('no solicita datos privados sin una sesión',async()=>{
  getSession.mockResolvedValue({data:{session:null},error:null});
  await expect(callFriFunction({action:'list'},true)).rejects.toMatchObject({status:401});
  expect(fetch).not.toHaveBeenCalled();
 });
 it('conserva el rechazo de permisos del servidor',async()=>{
  getSession.mockResolvedValue({data:{session:{access_token:'test-user-token'}},error:null});
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({message:'Cuenta desactivada'}),{status:403}));
  await expect(callFriFunction({action:'list'},true)).rejects.toMatchObject({status:403,message:'Cuenta desactivada'});
 });
 it('no interpreta un error HTML como éxito',async()=>{
  vi.mocked(fetch).mockResolvedValue(new Response('gateway unavailable',{status:503}));
  await expect(callFriFunction({action:'receipt',id:'test',token:'test'})).rejects.toMatchObject({status:503});
 });
 it('rechaza una respuesta que no sea PDF al descargar',async()=>{
  vi.mocked(fetch).mockResolvedValue(Response.json({message:'unexpected'}));
  await expect(callFriFunction({action:'pdf'},false,true)).rejects.toThrow('No se pudo descargar');
 });
});
