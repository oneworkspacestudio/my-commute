import React,{createContext,useContext,createElement as h} from 'react';
import {Route,Clock3,Activity,Bookmark,Settings,MapPin,ArrowUpRight,ArrowRight,RefreshCw,BriefcaseBusiness,House,Plus,Pencil,TrainFront,BusFront,Flag,Sparkles,Trash2,Search,Footprints,Grid2X2} from 'lucide-react';
export const Actions=createContext<{act:(intent:string,payload?:unknown)=>void;change:(name:string,value:string)=>void}>({act:()=>{},change:()=>{}});
type P=Record<string,any>;
const icons:Record<string,React.ElementType>={route:Route,clock:Clock3,activity:Activity,bookmark:Bookmark,settings:Settings,'map-pin':MapPin,'arrow-up-right':ArrowUpRight,'arrow-right':ArrowRight,refresh:RefreshCw,briefcase:BriefcaseBusiness,home:House,plus:Plus,pencil:Pencil,train:TrainFront,bus:BusFront,flag:Flag,sparkles:Sparkles,trash:Trash2,search:Search,walk:Footprints,apps:Grid2X2};
function cls(base:string,p:P){return [base,p.variant&&`${base}--${p.variant}`,p.gap&&`gap-${p.gap}`,p.tone&&`tone-${p.tone}`].filter(Boolean).join(' ');}
function box(tag:string,base:string){return({children,...p}:P)=>h(tag,{className:cls(base,p),role:p.role},children);}
export const Page=box('div','page'),Row=box('div','row'),Stack=box('div','stack'),Section=box('section','section'),Card=box('section','card'),Grid=box('div','grid'),Text=box('p','text'),Badge=box('span','badge'),Alert=box('div','alert');
export const Heading=({level=2,children,...p}:P)=>h(`h${level}`,{className:cls('heading',p)},children);
export const Spacer=()=>h('div',{className:'spacer'}),Divider=()=>h('hr'),Image=(p:P)=>h('img',p);
export const Icon=({name,...p}:P)=>h(icons[name]||TrainFront,{className:cls('icon',p),size:21,'aria-hidden':true,strokeWidth:1.8});
export function Button({children,intent,payload,icon,onClick,label,pressed,...p}:P){
 const {act}=useContext(Actions);
 return h('button',{type:'button',className:cls('button',p),disabled:p.disabled,'aria-label':label,'aria-pressed':pressed,
  onClick:intent?()=>act(intent,payload):onClick},icon&&h(Icon,{name:icon}),children);
}
export function Link({children,...p}:P){return h('a',{className:cls('link',p),href:p.href,target:p.target,rel:p.target?'noopener noreferrer':undefined,'data-workspace-apps-trigger':p.variant==='apps'?'true':undefined},p.variant==='apps'&&h(Icon,{name:'apps'}),children);}
export function Input({label,name,value,...p}:P){const {change}=useContext(Actions);return h('label',{className:'field'},h('span',null,label),h('input',{...p,id:name,name,value:value??'',onChange:(e:React.ChangeEvent<HTMLInputElement>)=>change(name,e.target.value)}));}
export function Select({label,name,value,options=[]}:P){const {change}=useContext(Actions);return h('label',{className:'field'},label&&h('span',null,label),h('select',{'aria-label':label,id:name,name,value,onChange:(e:React.ChangeEvent<HTMLSelectElement>)=>change(name,e.target.value)},options.map((o:P)=>h('option',{key:o.value,value:o.value},o.label))));}

export function Services({label,name,value,options=[],disabled}:P){const {change}=useContext(Actions);const chosen=String(value||'').split(',');return h('fieldset',{className:'service-choices',disabled},h('legend',null,label),options.filter((o:P)=>o.value).map((o:P)=>h('label',{key:o.value},h('input',{type:'checkbox',checked:chosen.includes(o.value),onChange:(e:React.ChangeEvent<HTMLInputElement>)=>change(name,(e.target.checked?[...chosen.filter(Boolean),o.value]:chosen.filter(x=>x!==o.value)).join(','))}),o.label)));}
export function FileInput({label}:P){const {act}=useContext(Actions);return h('label',{className:'field'},h('span',null,label),h('input',{type:'file',accept:'.json,application/json',onChange:async(e:React.ChangeEvent<HTMLInputElement>)=>{const input=e.currentTarget,file=input.files?.[0];input.value='';if(!file)return;if(file.size>131072){act('importError','Choose a journey file smaller than 128 KB.');return;}try{act('importJourney',await file.text());}catch{act('importError','The journey file could not be read.');}}}));}
