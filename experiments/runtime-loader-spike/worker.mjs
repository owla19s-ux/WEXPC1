import {pathToFileURL} from 'node:url';
const module=await import(pathToFileURL(process.argv[2]).href);
if(typeof module.execute!=='function')throw Error('NO_EXECUTE');
process.on('message',async ({id,input})=>{
  try { process.send({id,value:await module.execute(input)}); }
  catch(error){process.send({id,error:String(error.message)});}
});
process.send({type:'ready'});
