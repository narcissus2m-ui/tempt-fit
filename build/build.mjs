// 빌드: app.jsx → app/tempt-fit.html + docs/index.html (단독 실행 HTML)
// 사용: node build/build.mjs [app 폴더]  (esbuild 필요: npm i esbuild)
// 머리(head·CSS)와 로고는 기존 HTML에서 그대로 가져오고, 마지막 앱 스크립트만 교체합니다.
import { readFileSync, writeFileSync } from "node:fs";
import { transformSync } from "esbuild";
const dir = (process.argv[2] || new URL("..", import.meta.url).pathname).replace(/\/?$/, "/"); // 인자로 app 폴더 지정 가능
const html = readFileSync(dir + "tempt-fit.html", "utf8");
const jsx = readFileSync(dir + "app.jsx", "utf8");
const SB = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>';
const REACT_DOM = '<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>';
const cut = html.lastIndexOf("<script>\n");
let head = html.slice(0, cut);
if (!head.includes(SB)) head = head.replace(REACT_DOM, REACT_DOM + "\n" + SB);
const js = transformSync(jsx, { loader: "jsx", target: "es2019", legalComments: "none" }).code;
const out = head + "<script>\n" + js + "</script></body></html>\n";
writeFileSync(dir + "tempt-fit.html", out);
// GitHub Pages 공개본: docs/index.html (manifest·아이콘·안내서는 docs/에 함께 있음)
writeFileSync(new URL("../docs/index.html", import.meta.url), out);
console.log("ok", (head.length + js.length) / 1024 | 0, "KB");
