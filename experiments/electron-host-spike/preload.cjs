const {contextBridge,ipcRenderer}=require('electron');
// No IPC object/event/channel or host object is passed through the bridge.
contextBridge.exposeInMainWorld('wexHost',Object.freeze({
 readStatus:()=>ipcRenderer.invoke('wex-spike:status',{}),
}));
