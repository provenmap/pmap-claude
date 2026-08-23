#!/usr/bin/env node
"use strict";var d=Object.defineProperty;var $=Object.getOwnPropertyDescriptor;var k=Object.getOwnPropertyNames;var b=Object.prototype.hasOwnProperty;var v=(e,t)=>{for(var n in t)d(e,n,{get:t[n],enumerable:!0})},A=(e,t,n,s)=>{if(t&&typeof t=="object"||typeof t=="function")for(let r of k(t))!b.call(e,r)&&r!==n&&d(e,r,{get:()=>t[r],enumerable:!(s=$(t,r))||s.enumerable});return e};var S=e=>A(d({},"__esModule",{value:!0}),e);var O={};v(O,{HOST_ADAPTERS:()=>y});module.exports=S(O);var m=require("child_process"),y={claude:{parseList(e){if(!Array.isArray(e))throw new Error(`expected a JSON array, got ${f(e)}`);return e.map(t=>({id:String(t.id??""),version:String(t.version??""),scope:t.scope,refreshable:!0}))},refreshArgs:(e,t)=>["plugin","marketplace","update",t],applyArgs:e=>["plugin","update",e.id,"--scope",e.scope??"user"],installHint:e=>`/plugin install ${e}@<marketplace>`,hasScopes:!0},codex:{parseList(e){let t=e?.installed;if(!Array.isArray(t))throw new Error(`expected an object with an "installed" array, got ${f(e)}`);return t.map(n=>({id:String(n.pluginId??""),version:String(n.version??""),refreshable:n.marketplaceSource?.sourceType==="git"}))},refreshArgs:(e,t)=>e.refreshable?["plugin","marketplace","upgrade",t]:null,applyArgs:e=>["plugin","add",e.id],installHint:e=>`codex plugin add ${e}@<marketplace>`,hasScopes:!1}};function f(e){return e===null?"null":Array.isArray(e)?"an array":typeof e!="object"?typeof e:`an object with keys: ${Object.keys(e).join(", ")||"(none)"}`}function I(){let e=process.argv.slice(2),t={host:"",pluginName:"",hostName:""};for(let n=0;n<e.length;n++)switch(e[n]){case"--host":t.host=e[++n];break;case"--plugin-name":t.pluginName=e[++n];break;case"--host-name":t.hostName=e[++n];break;case"--help":console.log(`
CodePlugin Update CLI

Updates this plugin via the host's own plugin manager (marketplace refresh +
scoped update), looking up the installed marketplace/scope instead of
guessing them.

Usage: node pmap-update.js --host <claude|codex|cursor> --plugin-name <name> --host-name <label>

Output: JSON to stdout with a \`display\` field of ready-to-show markdown.
`),process.exit(0)}return t}function l(e,t,n,s){e.success=!1,e.status="error",e.error=t,e.errorCode=n,e.display=s??`\u274C **Update failed** \u2014 ${t}`,console.log(JSON.stringify(e,null,2)),process.exit(n)}function g(e,t){let n=(0,m.spawnSync)(e,t,{encoding:"utf-8"});if(n.error)return{code:1,output:`Could not run \`${e}\`: ${n.error.message}`};let s=[n.stdout,n.stderr].filter(Boolean).join(`
`).trim();return{code:n.status??1,output:s}}function h(e,t,n,s){let r=g(e,["plugin","list","--json"]);r.code!==0&&l(s,`\`${e} plugin list --json\` failed: ${r.output}`,4);let i;try{i=t.parseList(JSON.parse(r.output))}catch(o){l(s,`\`${e} plugin list --json\` returned unusable output (${o.message}): ${r.output}`,4)}let c=`${n}@`,u=i.find(o=>o.id?.startsWith(c));if(!u){let o=i.map(a=>a.id).join(", ")||"(none)",p=t.hasScopes?" across every scope":"";l(s,`"${n}" is not currently installed${t.hasScopes?" under any scope":""}.`,2,`\u274C **"${n}" isn't installed** \u2014 checked \`${e} plugin list\`${p} and found no match.

Currently installed: ${o}

If it's installed under a different name/marketplace, update it directly with that host's plugin manager. Otherwise install it first: \`${t.installHint(n)}\`.`)}return u}function w(e,t){return{success:!0,status:"manual",display:`**${t} has no marketplace or update command** \u2014 there's nothing to run automatically.

Rebuild the plugin from source (\`yarn build\` in plugins) or pull the latest release, then re-copy it over the local install:

\`\`\`bash
cp -r ${e} ~/.cursor/plugins/local/${e}
\`\`\`

Then restart ${t}.`}}function x(){let{host:e,pluginName:t,hostName:n}=I(),s={success:!1};(!e||!t||!n)&&l(s,"Missing required --host, --plugin-name, or --host-name.",4),e==="cursor"&&(console.log(JSON.stringify(w(t,n),null,2)),process.exit(0));let r=y[e];r||l(s,`Unsupported host "${e}" \u2014 expected claude, codex, or cursor.`,4);let i=h(e,r,t,s),c=i.id.split("@")[1];s.oldVersion=i.version;let u=r.refreshArgs(i,c);if(u){let a=g(e,u);a.code!==0&&l(s,`marketplace refresh failed: ${a.output}`,1,`\u274C **Marketplace refresh failed** for \`${c}\`:

\`\`\`
${a.output}
\`\`\``)}let o=g(e,r.applyArgs(i));if(o.code!==0){let a=i.scope?` (scope: ${i.scope})`:"";l(s,`plugin update failed: ${o.output}`,3,`\u274C **Update failed** for \`${t}\`${a}:

\`\`\`
${o.output}
\`\`\``)}let p=h(e,r,t,s);s.newVersion=p.version,s.success=!0,p.version!==i.version?(s.status="updated",s.display=`\u2705 **Updated \`${t}\`: ${i.version} \u2192 ${p.version}.**

Restart ${n} to load it.`):(s.status="already-latest",s.display=`\u2705 **\`${t}\` is already on the latest version (${i.version}).**`),console.log(JSON.stringify(s,null,2)),process.exit(0)}typeof require<"u"&&typeof module<"u"&&require.main===module&&x();0&&(module.exports={HOST_ADAPTERS});
