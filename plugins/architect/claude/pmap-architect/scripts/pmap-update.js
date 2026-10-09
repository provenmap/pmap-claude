#!/usr/bin/env node
"use strict";var v=Object.create;var g=Object.defineProperty;var I=Object.getOwnPropertyDescriptor;var C=Object.getOwnPropertyNames;var S=Object.getPrototypeOf,O=Object.prototype.hasOwnProperty;var P=(t,e)=>{for(var n in e)g(t,n,{get:e[n],enumerable:!0})},h=(t,e,n,r)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of C(e))!O.call(t,s)&&s!==n&&g(t,s,{get:()=>e[s],enumerable:!(r=I(e,s))||r.enumerable});return t};var y=(t,e,n)=>(n=t!=null?v(S(t)):{},h(e||!t||!t.__esModule?g(n,"default",{value:t,enumerable:!0}):n,t)),k=t=>h(g({},"__esModule",{value:!0}),t);var M={};P(M,{HOST_ADAPTERS:()=>R});module.exports=k(M);var b=require("child_process");var H=require("crypto"),m=y(require("os")),L=y(require("path"));var w=require("child_process"),j=64*1024*1024;var u="",U="",D=`${U}%H${u}%aN${u}%aE${u}%aI${u}%s${u}%b${u}`;function $(t){return t==="claude"?process.env.CLAUDE_CODE_EXECPATH||"claude":t}var R={claude:{parseList(t){if(!Array.isArray(t))throw new Error(`expected a JSON array, got ${x(t)}`);return t.map(e=>({id:String(e.id??""),version:String(e.version??""),scope:e.scope,refreshable:!0}))},refreshArgs:(t,e)=>["plugin","marketplace","update",e],applyArgs:t=>["plugin","update",t.id,"--scope",t.scope??"user"],installHint:t=>`/plugin install ${t}@<marketplace>`,hasScopes:!0},codex:{parseList(t){let e=t?.installed;if(!Array.isArray(e))throw new Error(`expected an object with an "installed" array, got ${x(t)}`);return e.map(n=>({id:String(n.pluginId??""),version:String(n.version??""),refreshable:n.marketplaceSource?.sourceType==="git"}))},refreshArgs:(t,e)=>t.refreshable?["plugin","marketplace","upgrade",e]:null,applyArgs:t=>["plugin","add",t.id],installHint:t=>`codex plugin add ${t}@<marketplace>`,hasScopes:!1}};function x(t){return t===null?"null":Array.isArray(t)?"an array":typeof t!="object"?typeof t:`an object with keys: ${Object.keys(t).join(", ")||"(none)"}`}function E(){let t=process.argv.slice(2),e={host:"",pluginName:"",hostName:""};for(let n=0;n<t.length;n++)switch(t[n]){case"--host":e.host=t[++n];break;case"--plugin-name":e.pluginName=t[++n];break;case"--host-name":e.hostName=t[++n];break;case"--help":console.log(`
CodePlugin Update CLI

Updates this plugin via the host's own plugin manager (marketplace refresh +
scoped update), looking up the installed marketplace/scope instead of
guessing them.

Usage: node pmap-update.js --host <claude|codex|cursor> --plugin-name <name> --host-name <label>

Output: JSON to stdout with a \`display\` field of ready-to-show markdown.
`),process.exit(0)}return e}function l(t,e,n,r){t.success=!1,t.status="error",t.error=e,t.errorCode=n,t.display=r??`\u274C **Update failed** \u2014 ${e}`,console.log(JSON.stringify(t,null,2)),process.exit(n)}function f(t,e){let n=(0,b.spawnSync)($(t),e,{encoding:"utf-8"});if(n.error)return{code:1,output:`Could not run \`${t}\`: ${n.error.message}`};let r=[n.stdout,n.stderr].filter(Boolean).join(`
`).trim();return{code:n.status??1,output:r}}function A(t,e,n,r){let s=f(t,["plugin","list","--json"]);s.code!==0&&l(r,`\`${t} plugin list --json\` failed: ${s.output}`,4);let o;try{o=e.parseList(JSON.parse(s.output))}catch(i){l(r,`\`${t} plugin list --json\` returned unusable output (${i.message}): ${s.output}`,4)}let d=`${n}@`,c=o.find(i=>i.id?.startsWith(d));if(!c){let i=o.map(a=>a.id).join(", ")||"(none)",p=e.hasScopes?" across every scope":"";l(r,`"${n}" is not currently installed${e.hasScopes?" under any scope":""}.`,2,`\u274C **"${n}" isn't installed** \u2014 checked \`${t} plugin list\`${p} and found no match.

Currently installed: ${i}

If it's installed under a different name/marketplace, update it directly with that host's plugin manager. Otherwise install it first: \`${e.installHint(n)}\`.`)}return c}function N(t,e){return{success:!0,status:"manual",display:`**${e} has no marketplace or update command** \u2014 there's nothing to run automatically.

Rebuild the plugin from source (\`yarn build\` in plugins) or pull the latest release, then re-copy it over the local install:

\`\`\`bash
cp -r ${t} ~/.cursor/plugins/local/${t}
\`\`\`

Then restart ${e}.`}}function T(){let{host:t,pluginName:e,hostName:n}=E(),r={success:!1};(!t||!e||!n)&&l(r,"Missing required --host, --plugin-name, or --host-name.",4),t==="cursor"&&(console.log(JSON.stringify(N(e,n),null,2)),process.exit(0));let s=R[t];s||l(r,`Unsupported host "${t}" \u2014 expected claude, codex, or cursor.`,4);let o=A(t,s,e,r),d=o.id.split("@")[1];r.oldVersion=o.version;let c=s.refreshArgs(o,d);if(c){let a=f(t,c);a.code!==0&&l(r,`marketplace refresh failed: ${a.output}`,1,`\u274C **Marketplace refresh failed** for \`${d}\`:

\`\`\`
${a.output}
\`\`\``)}let i=f(t,s.applyArgs(o));if(i.code!==0){let a=o.scope?` (scope: ${o.scope})`:"";l(r,`plugin update failed: ${i.output}`,3,`\u274C **Update failed** for \`${e}\`${a}:

\`\`\`
${i.output}
\`\`\``)}let p=A(t,s,e,r);r.newVersion=p.version,r.success=!0,p.version!==o.version?(r.status="updated",r.display=`\u2705 **Updated \`${e}\`: ${o.version} \u2192 ${p.version}.**

Restart ${n} to load it.`):(r.status="already-latest",r.display=`\u2705 **\`${e}\` is already on the latest version (${o.version}).**`),console.log(JSON.stringify(r,null,2)),process.exit(0)}typeof require<"u"&&typeof module<"u"&&require.main===module&&T();0&&(module.exports={HOST_ADAPTERS});
