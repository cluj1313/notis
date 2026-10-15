cd /workspace/notis/src
for f in head.html app.js tts.js ../sw.js; do [ -s $f ] || { echo "EMPTY $f"; exit 1; }; done
{ cat head.html; printf '<script>\n'; cat tts.js; printf '</script>\n<script>\n'; cat app.js; printf '</script>\n</body>\n</html>\n'; } > ../index.html
cd .. && node -e "const h=require('fs').readFileSync('index.html','utf8');[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(m=>new Function(m[1]));console.log('syntax OK')"
