// Standalone short-lived trusted-plugin lifecycle probe; never an Electron entry.
import {Context} from '@deepseek-ai/cordis';
import Loader from '@deepseek-ai/cordis-plugin-loader';
const plugins={hello:'../checks/fixtures-native-bundle/index.mjs',throw:'../checks/fixtures-throw.mjs',missing:'../checks/does-not-exist.mjs'};
const mode=process.argv[2]??'hello';
if(!Object.hasOwn(plugins,mode))throw Error('expected hello, throw or missing');
const emit=type=>console.log(JSON.stringify({type}));
const root=new Context();let failure;
root.on('wex-test/hello-loaded',()=>emit('loaded'));
root.on('wex-test/hello-disposed',()=>emit('unloaded'));
try {
 const owner=root.plugin(Loader,{baseUrl:import.meta.url});await owner.await();
 emit('started');
 const id=await root.loader.create({id:'probe',name:plugins[mode]});
 await root.loader.await();
 const entry=root.loader.resolve(id);
 if(!entry.fiber)throw Error('plugin import failed');
 await entry.fiber.await();
 root.loader.remove(id);await entry.fiber.dispose();
} catch(e){failure=e;}
finally {
 try{await root.fiber.dispose();}catch(e){failure??=e;}
 console.log(JSON.stringify({type:failure?'failed':'stopped',disposed:root.loader===undefined,...(failure?{message:failure.message}:{})}));
 process.exitCode=failure?1:0;
}
