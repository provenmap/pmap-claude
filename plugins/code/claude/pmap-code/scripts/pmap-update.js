#!/usr/bin/env node
"use strict";var S=Object.create;var d=Object.defineProperty;var b=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var I=Object.getPrototypeOf,P=Object.prototype.hasOwnProperty;var C=(e,t)=>{for(var n in t)d(e,n,{get:t[n],enumerable:!0})},h=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of k(t))!P.call(e,s)&&s!==n&&d(e,s,{get:()=>t[s],enumerable:!(r=b(t,s))||r.enumerable});return e};var m=(e,t,n)=>(n=e!=null?S(I(e)):{},h(t||!e||!e.__esModule?d(n,"default",{value:e,enumerable:!0}):n,e)),O=e=>h(d({},"__esModule",{value:!0}),e);var _={};C(_,{HOST_ADAPTERS:()=>A});module.exports=O(_);var x=require("child_process");var U=require("child_process");var w=require("crypto"),H=require("child_process"),g=m(require("os")),N=m(require("path"));function y(e){return e==="claude"?process.env.CLAUDE_CODE_EXECPATH||"claude":e}var A={claude:{parseList(e){if(!Array.isArray(e))throw new Error(`expected a JSON array, got ${$(e)}`);return e.map(t=>({id:String(t.id??""),version:String(t.version??""),scope:t.scope,refreshable:!0}))},refreshArgs:(e,t)=>["plugin","marketplace","update",t],applyArgs:e=>["plugin","update",e.id,"--scope",e.scope??"user"],installHint:e=>`/plugin install ${e}@<marketplace>`,hasScopes:!0},codex:{parseList(e){let t=e?.installed;if(!Array.isArray(t))throw new Error(`expected an object with an "installed" array, got ${$(e)}`);return t.map(n=>({id:String(n.pluginId??""),version:String(n.version??""),refreshable:n.marketplaceSource?.sourceType==="git"}))},refreshArgs:(e,t)=>e.refreshable?["plugin","marketplace","upgrade",t]:null,applyArgs:e=>["plugin","add",e.id],installHint:e=>`codex plugin add ${e}@<marketplace>`,hasScopes:!1}};function $(e){return e===null?"null":Array.isArray(e)?"an array":typeof e!="object"?typeof e:`an object with keys: ${Object.keys(e).join(", ")||"(none)"}`}function E(){let e=process.argv.slice(2),t={host:"",pluginName:"",hostName:""};for(let n=0;n<e.length;n++)switch(e[n]){case"--host":t.host=e[++n];break;case"--plugin-name":t.pluginName=e[++n];break;case"--host-name":t.hostName=e[++n];break;case"--help":console.log(`
CodePlugin Update CLI

Updates this plugin via the host's own plugin manager (marketplace refresh +
scoped update), looking up the installed marketplace/scope instead of
guessing them.

Usage: node pmap-update.js --host <claude|codex|cursor> --plugin-name <name> --host-name <label>

Output: JSON to stdout with a \`display\` field of ready-to-show markdown.
`),process.exit(0)}return t}function l(e,t,n,r){e.success=!1,e.status="error",e.error=t,e.errorCode=n,e.display=r??`\u274C **Update failed** \u2014 ${t}`,console.log(JSON.stringify(e,null,2)),process.exit(n)}function f(e,t){let n=(0,x.spawnSync)(y(e),t,{encoding:"utf-8"});if(n.error)return{code:1,output:`Could not run \`${e}\`: ${n.error.message}`};let r=[n.stdout,n.stderr].filter(Boolean).join(`
`).trim();return{code:n.status??1,output:r}}function v(e,t,n,r){let s=f(e,["plugin","list","--json"]);s.code!==0&&l(r,`\`${e} plugin list --json\` failed: ${s.output}`,4);let o;try{o=t.parseList(JSON.parse(s.output))}catch(i){l(r,`\`${e} plugin list --json\` returned unusable output (${i.message}): ${s.output}`,4)}let p=`${n}@`,u=o.find(i=>i.id?.startsWith(p));if(!u){let i=o.map(a=>a.id).join(", ")||"(none)",c=t.hasScopes?" across every scope":"";l(r,`"${n}" is not currently installed${t.hasScopes?" under any scope":""}.`,2,`\u274C **"${n}" isn't installed** \u2014 checked \`${e} plugin list\`${c} and found no match.

Currently installed: ${i}

If it's installed under a different name/marketplace, update it directly with that host's plugin manager. Otherwise install it first: \`${t.installHint(n)}\`.`)}return u}function L(e,t){return{success:!0,status:"manual",display:`**${t} has no marketplace or update command** \u2014 there's nothing to run automatically.

Rebuild the plugin from source (\`yarn build\` in plugins) or pull the latest release, then re-copy it over the local install:

\`\`\`bash
cp -r ${e} ~/.cursor/plugins/local/${e}
\`\`\`

Then restart ${t}.`}}function j(){let{host:e,pluginName:t,hostName:n}=E(),r={success:!1};(!e||!t||!n)&&l(r,"Missing required --host, --plugin-name, or --host-name.",4),e==="cursor"&&(console.log(JSON.stringify(L(t,n),null,2)),process.exit(0));let s=A[e];s||l(r,`Unsupported host "${e}" \u2014 expected claude, codex, or cursor.`,4);let o=v(e,s,t,r),p=o.id.split("@")[1];r.oldVersion=o.version;let u=s.refreshArgs(o,p);if(u){let a=f(e,u);a.code!==0&&l(r,`marketplace refresh failed: ${a.output}`,1,`\u274C **Marketplace refresh failed** for \`${p}\`:

\`\`\`
${a.output}
\`\`\``)}let i=f(e,s.applyArgs(o));if(i.code!==0){let a=o.scope?` (scope: ${o.scope})`:"";l(r,`plugin update failed: ${i.output}`,3,`\u274C **Update failed** for \`${t}\`${a}:

\`\`\`
${i.output}
\`\`\``)}let c=v(e,s,t,r);r.newVersion=c.version,r.success=!0,c.version!==o.version?(r.status="updated",r.display=`\u2705 **Updated \`${t}\`: ${o.version} \u2192 ${c.version}.**

Restart ${n} to load it.`):(r.status="already-latest",r.display=`\u2705 **\`${t}\` is already on the latest version (${o.version}).**`),console.log(JSON.stringify(r,null,2)),process.exit(0)}typeof require<"u"&&typeof module<"u"&&require.main===module&&j();0&&(module.exports={HOST_ADAPTERS});
