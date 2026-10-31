// Test harness ONLY. Concatenated after the unchanged real preload by build.mjs.
// Fixed negative probes; never accepts a channel, action or identity from page JS.
contextBridge.exposeInMainWorld('wexNegativeProbes',Object.freeze({
 invalid:()=>ipcRenderer.invoke('wex-spike:status',{subject:'admin'}),
 unauthorized:()=>ipcRenderer.invoke('wex-spike:status',{action:'protected-probe'}),
}));
