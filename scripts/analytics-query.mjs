// Read-only funnel query. Pass exactly --local or --remote to choose the database.
import {readFileSync} from 'node:fs'
import {execFileSync} from 'node:child_process'
import path from 'node:path'
const mode=process.argv[2]
if(!['--local','--remote'].includes(mode)||process.argv.length!==3)throw Error('Use --local or --remote')
const sql=readFileSync(new URL('../sql/funnel.sql',import.meta.url),'utf8').replace(/^\uFEFF/,'').replace(/^--.*$/gm,'').trim()
execFileSync(process.execPath,[path.resolve('node_modules/wrangler/bin/wrangler.js'),'d1','execute','gymgogo-growth-lab',mode,'--command',sql,'--json'],{stdio:'inherit'})
