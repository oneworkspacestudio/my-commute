import {parse,compileReact} from '@codedia/parser';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
await mkdir('web/src/generated',{recursive:true});
for(const name of await readdir('web/src/screens')) if(name.endsWith('.aui')) await writeFile('web/src/generated/'+name.replace('.aui','.tsx'),'// @ts-nocheck -- compiler emits untyped data loops; controller and engine are typechecked.\n// Generated from screens/'+name+'; edit AUI source.\n'+compileReact(parse(await readFile('web/src/screens/'+name,'utf8'))));
