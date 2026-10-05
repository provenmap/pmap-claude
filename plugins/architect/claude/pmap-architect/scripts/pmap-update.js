#!/usr/bin/env node
"use strict";var I=Object.create;var g=Object.defineProperty;var R=Object.getOwnPropertyDescriptor;var C=Object.getOwnPropertyNames;var S=Object.getPrototypeOf,O=Object.prototype.hasOwnProperty;var P=(e,t)=>{for(var n in t)g(e,n,{get:t[n],enumerable:!0})},h=(e,t,n,r)=>{if(t&&typeof t=="object"||typeof t=="function")for(let s of C(t))!O.call(e,s)&&s!==n&&g(e,s,{get:()=>t[s],enumerable:!(r=R(t,s))||r.enumerable});return e};var y=(e,t,n)=>(n=e!=null?I(S(e)):{},h(t||!e||!e.__esModule?g(n,"default",{value:e,enumerable:!0}):n,e)),k=e=>h(g({},"__esModule",{value:!0}),e);var M={};P(M,{HOST_ADAPTERS:()=>v});module.exports=k(M);var b=require("child_process");var U=require("crypto"),m=y(require("os")),L=y(require("path"));var w=require("child_process"),j=64*1024*1024;var l="",H="",D=`${H}%H${l}%aN${l}%aE${l}%aI${l}%s${l}%b${l}`;function x(e){return e==="claude"?process.env.CLAUDE_CODE_EXECPATH||"claude":e}var v={claude:{parseList(e){if(!Array.isArray(e))throw new Error(`expected a JSON array, got ${$(e)}`);return e.map(t=>({id:String(t.id??""),version:String(t.version??""),scope:t.scope,refreshable:!0}))},refreshArgs:(e,t)=>["plugin","marketplace","update",t],applyArgs:e=>["plugin","update",e.id,"--scope",e.scope??"user"],installHint:e=>`/plugin install ${e}@<marketplace>`,hasScopes:!0},codex:{parseList(e){let t=e?.installed;if(!Array.isArray(t))throw new Error(`expected an object with an "installed" array, got ${$(e)}`);return t.map(n=>({id:String(n.pluginId??""),version:String(n.version??""),refreshable:n.marketplaceSource?.sourceType==="git"}))},refreshArgs:(e,t)=>e.refreshable?["plugin","marketplace","upgrade",t]:null,applyArgs:e=>["plugin","add",e.id],installHint:e=>`codex plugin add ${e}@<marketplace>`,hasScopes:!1}};function $(e){return e===null?"null":Array.isArray(e)?"an array":typeof e!="object"?typeof e:`an object with keys: ${Object.keys(e).join(", ")||"(none)"}`}function E(){let e=process.argv.slice(2),t={host:"",pluginName:"",hostName:""};for(let n=0;n<e.length;n++)switch(e[n]){case"--host":t.host=e[++n];break;case"--plugin-name":t.pluginName=e[++n];break;case"--host-name":t.hostName=e[++n];break;case"--help":console.log(`
CodePlugin Update CLI

Updates this plugin via the host's own plugin manager (marketplace refresh +
scoped update), looking up the installed marketplace/scope instead of
guessing them.

Usage: node pmap-update.js --host <claude|codex|cursor> --plugin-name <name> --host-name <label>

Output: JSON to stdout with a \`display\` field of ready-to-show markdown.
`),process.exit(0)}return t}function u(e,t,n,r){e.success=!1,e.status="error",e.error=t,e.errorCode=n,e.display=r??`\u274C **Update failed** \u2014 ${t}`,console.log(JSON.stringify(e,null,2)),process.exit(n)}function f(e,t){let n=(0,b.spawnSync)(x(e),t,{encoding:"utf-8"});if(n.error)return{code:1,output:`Could not run \`${e}\`: ${n.error.message}`};let r=[n.stdout,n.stderr].filter(Boolean).join(`
`).trim();return{code:n.status??1,output:r}}function A(e,t,n,r){let s=f(e,["plugin","list","--json"]);s.code!==0&&u(r,`\`${e} plugin list --json\` failed: ${s.output}`,4);let o;try{o=t.parseList(JSON.parse(s.output))}catch(i){u(r,`\`${e} plugin list --json\` returned unusable output (${i.message}): ${s.output}`,4)}let d=`${n}@`,c=o.find(i=>i.id?.startsWith(d));if(!c){let i=o.map(a=>a.id).join(", ")||"(none)",p=t.hasScopes?" across every scope":"";u(r,`"${n}" is not currently installed${t.hasScopes?" under any scope":""}.`,2,`\u274C **"${n}" isn't installed** \u2014 checked \`${e} plugin list\`${p} and found no match.

Currently installed: ${i}

If it's installed under a different name/marketplace, update it directly with that host's plugin manager. Otherwise install it first: \`${t.installHint(n)}\`.`)}return c}function N(e,t){return{success:!0,status:"manual",display:`**${t} has no marketplace or update command** \u2014 there's nothing to run automatically.

Rebuild the plugin from source (\`yarn build\` in plugins) or pull the latest release, then re-copy it over the local install:

\`\`\`bash
cp -r ${e} ~/.cursor/plugins/local/${e}
\`\`\`

Then restart ${t}.`}}function T(){let{host:e,pluginName:t,hostName:n}=E(),r={success:!1};(!e||!t||!n)&&u(r,"Missing required --host, --plugin-name, or --host-name.",4),e==="cursor"&&(console.log(JSON.stringify(N(t,n),null,2)),process.exit(0));let s=v[e];s||u(r,`Unsupported host "${e}" \u2014 expected claude, codex, or cursor.`,4);let o=A(e,s,t,r),d=o.id.split("@")[1];r.oldVersion=o.version;let c=s.refreshArgs(o,d);if(c){let a=f(e,c);a.code!==0&&u(r,`marketplace refresh failed: ${a.output}`,1,`\u274C **Marketplace refresh failed** for \`${d}\`:

\`\`\`
${a.output}
\`\`\``)}let i=f(e,s.applyArgs(o));if(i.code!==0){let a=o.scope?` (scope: ${o.scope})`:"";u(r,`plugin update failed: ${i.output}`,3,`\u274C **Update failed** for \`${t}\`${a}:

\`\`\`
${i.output}
\`\`\``)}let p=A(e,s,t,r);r.newVersion=p.version,r.success=!0,p.version!==o.version?(r.status="updated",r.display=`\u2705 **Updated \`${t}\`: ${o.version} \u2192 ${p.version}.**

Restart ${n} to load it.`):(r.status="already-latest",r.display=`\u2705 **\`${t}\` is already on the latest version (${o.version}).**`),console.log(JSON.stringify(r,null,2)),process.exit(0)}typeof require<"u"&&typeof module<"u"&&require.main===module&&T();0&&(module.exports={HOST_ADAPTERS});
