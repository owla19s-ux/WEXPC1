import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
type Reply={ok:true;value:{status:string}}|{ok:false;error:string};
declare global {interface Window {wexHost:{readStatus:()=>Promise<Reply>}}}
function App(){
 const [text,setText]=useState('连接中');
 const refresh=async()=>{try{const reply=await window.wexHost.readStatus();setText(reply.ok?reply.value.status:reply.error);}catch{setText('host_unavailable');}};
 useEffect(()=>{void refresh();},[]);
 return <><h1>WEXPC1 · 宿主最小实验</h1><p>基础宿主状态</p><pre id="status">{text}</pre><button onClick={()=>void refresh()}>重新读取</button></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
