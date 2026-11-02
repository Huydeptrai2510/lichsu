"use strict";
/* app.js: trình chiếu lịch sử, giai đoạn 2 (đồng bộ bằng Appwrite). Trang đánh số từ 0 (index); hiển thị cho người xem là index+1. */

/* ===== CẤU HÌNH NGƯỜI DÙNG ===== */
const CONFIG={
  appwriteEndpoint:"https://cloud.appwrite.io/v1", // endpoint trong Appwrite Console > Settings (hoặc URL máy chủ tự host)
  appwriteProject:"",   // Project ID (để trống = chạy local)
  appwriteDatabase:"",  // Database ID
  appwriteTable:"",     // Table ID (bảng presentation_state)
  appwriteRow:"state",  // Row ID cố định
  pushLocal:false,      // true: máy này là máy điều khiển, gửi trang hiện tại lên Appwrite
  useModels:true        // false: luôn dùng ảnh chân dung thay vì mô hình 3D
};
/* Máy điều khiển: mở trang kèm ?control=1 (không cần sửa mã), hoặc đặt pushLocal:true cho mọi máy */
const CONTROL=CONFIG.pushLocal||/[?&]control(=1|=true)?(&|$)/.test(location.search);
const BASE_PATH=new URL("./",document.baseURI).href,asset=f=>BASE_PATH+f;
const T3="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js";
const GL="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
const IMG_EXT=["png","jpg","jpeg","webp"],POS_EXT=["jpg","png","jpeg","webp"];
const $=s=>document.querySelector(s),RM=matchMedia("(prefers-reduced-motion:reduce)").matches;
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
let lastPushed=-1,cur=-1,perf=false,client=null,db=null,rt=null,sub=null,syncState="chưa cấu hình (chạy local)",M=[],autoT=0,pushT=0;
const CLIENT=Math.random().toString(36).slice(2,10),errs=[],seen=new Set(),FOUND={},VIDX={},GLB={};
const log=(k,m)=>{const t=k+": "+m;if(!seen.has(t)){seen.add(t);errs.push(t)}dbg()};

/* ===== NỘI DUNG (nguồn từng slide xem nút "Nguồn") ===== */
const CH=["Phần A: Xâm lược Đông Nam Á","Phần B: Xiêm và công cuộc cải cách","Phần C: Nhìn lại"];
const SRC={
  sgk:"SGK Lịch sử 11, bộ Kết nối tri thức (NXB Giáo dục Việt Nam)",
  tar:"N. Tarling (chủ biên), The Cambridge History of Southeast Asia (Cambridge University Press)",
  wy:"D. K. Wyatt, Thailand: A Short History (Yale University Press)",
  bp:"C. Baker và P. Phongpaichit, A History of Thailand (Cambridge University Press)",
  th:"Thongchai Winichakul, Siam Mapped (University of Hawaii Press, 1994)",
  icj:"Tòa án Công lý Quốc tế (ICJ), hồ sơ vụ Đền Preah Vihear (Campuchia kiện Thái Lan, 1959–1962): trích dẫn hiệp ước Pháp–Xiêm 1893, 1904, 1907"
};
const PH=["Bắt đầu xâm lược","Thiết lập kiểm soát","Hoàn tất / hợp nhất"];
const S=[
{id:"opening",ch:0,L:"hero",v:"opening_army",army:1,t:"Những đoàn quân đến từ biển",k:"Đông Nam Á, thế kỷ XVI đến đầu thế kỷ XX",s:["sgk"]},
{id:"earth-sea",ch:0,L:"hero",v:"intro_southeast_asia",earth:1,auto:1,geo:"Đông Nam Á",t:"Từ không gian, hướng về Đông Nam Á",k:"Chương 1: Quá trình xâm lược của chủ nghĩa thực dân",s:["sgk"]},
{id:"before",ch:0,L:"ed",t:"Đông Nam Á trước khi bị xâm lược",lead:"Nhiều quốc gia, nằm trên tuyến hàng hải nối Ấn Độ Dương với Biển Đông.",img:"historical_trade_port",
 p:["Các vương quốc lục địa: Đại Việt, Xiêm, Miến Điện, các quốc gia Khmer và Lào.","Các thế lực hải đảo: Aceh, Mataram, Johor, các vương quốc Hồi giáo ở Sulu.","Cảng biển như Malacca, Banten, Ayutthaya, Hội An nối gia vị, lúa gạo, hương liệu với thị trường châu Á và châu Âu."],s:["tar","sgk"]},
{id:"why",ch:0,L:"pc",t:"Vì sao thực dân phương Tây mở rộng sang Đông Nam Á?",
 st:["Kinh tế: cần nguyên liệu, thị trường, nơi đầu tư","Kỹ thuật và quân sự: tàu hơi nước, súng ống, kênh đào Suez (1869)","Cạnh tranh giữa các cường quốc châu Âu","Điều kiện tại chỗ: khủng hoảng, suy yếu, chia rẽ nội bộ","Tư tưởng: viện cớ “khai hóa”, truyền giáo"],
 res:"Xâm lược và thiết lập thuộc địa",note:"Không có một nguyên nhân duy nhất: các yếu tố tác động đồng thời.",s:["sgk","tar"]},
{id:"timeline",ch:0,L:"tl",bgv:"colonial_invasion",t:"Các mốc tiêu biểu",
 r:[["1511","Bồ Đào Nha chiếm Malacca",0],["1565–1571","Tây Ban Nha lập Cebu, rồi Manila",1],["Từ 1602","Công ty Đông Ấn Hà Lan mở rộng kiểm soát ở Indonesia",1],["1824–1886","Ba cuộc chiến Anh–Miến Điện; sáp nhập Thượng Miến Điện năm 1886",2],["1858","Pháp tấn công Đà Nẵng, mở đầu xâm lược Việt Nam",0],["1863","Campuchia thành xứ bảo hộ của Pháp",1],["1887–1893","Liên bang Đông Dương (1887); Pháp đặt Lào dưới quyền (1893)",2],["1898","Mỹ thay Tây Ban Nha ở Philippines",2]],s:["sgk","tar"]},
{id:"map",ch:0,L:"map",t:"Bản đồ thuộc địa Đông Nam Á",img:"map_colonial_southeast_asia",cap:"Tình trạng khoảng 1900–1914. Khi thay bản đồ, ghi đúng niên đại.",
 lg:[["Anh","Miến Điện (1886), Mã Lai, Singapore, Bắc Borneo, Brunei (bảo hộ từ 1888)","▲"],["Pháp","Việt Nam, Campuchia, Lào","●"],["Hà Lan","Đông Ấn Hà Lan (Indonesia)","■"],["Mỹ","Philippines từ 1898","◆"],["Bồ Đào Nha","Đông Timor","▼"],["Xiêm","Độc lập chính thức, chịu sức ép","○"]],s:["sgk","tar"]},
{id:"rule",ch:0,L:"sp",t:"Cách cai trị khác nhau",
 c:[["Anh","Miến Điện sáp nhập vào Ấn Độ thuộc Anh; Mã Lai cai trị qua các sultan; khai thác thiếc, cao su."],["Pháp","Đông Dương do Toàn quyền đứng đầu; Việt Nam chia ba kỳ với chế độ khác nhau; độc quyền muối, rượu, thuốc phiện."],["Hà Lan","Khai thác đồn điền ở Đông Ấn; Java chịu chế độ cưỡng bức trồng trọt từ 1830."],["Mỹ","Philippines từ 1898: đàn áp kháng chiến, mở trường công dạy tiếng Anh, trao tự trị từng bước."]],s:["tar","sgk"]},
{id:"effects",ch:0,L:"sp",n:2,t:"Hệ quả của chế độ thực dân",
 c:[["Kinh tế","Kinh tế đồn điền và khai thác mỏ, xuất khẩu nguyên liệu, phụ thuộc vào chính quốc."],["Xã hội","Xuất hiện công nhân, tư sản, trí thức mới; di dân lao động; thuế nặng."],["Chính trị","Mất chủ quyền; ranh giới thuộc địa cắt ngang các cộng đồng cũ; phong trào dân tộc hình thành."],["Văn hóa","Giáo dục kiểu phương Tây và tư tưởng mới, đi cùng đồng hóa và kiểm soát."]],note:"Hệ quả đa chiều, khác nhau theo từng nơi và từng giai đoạn.",s:["sgk","tar"]},
{id:"earth-siam",ch:1,L:"hero",v:"intro_siam",earth:1,auto:1,geo:"Xiêm (nay là Thái Lan)",t:"Giữa hai thế lực, Xiêm chọn cải cách",k:"Chương 2: Xiêm và công cuộc cải cách",s:["sgk"]},
{id:"rama",ch:1,L:"pr",t:"Hai vị vua của cải cách",
 p:[{m:"rama_iv",n:"Mongkut (Rama IV)",y:"1851–1868",d:"Từng tu nhiều năm, học khoa học và ngôn ngữ phương Tây; ký Hiệp ước Bowring năm 1855."},{m:"rama_v",n:"Chulalongkorn (Rama V)",y:"1868–1910",d:"Lên ngôi năm 15 tuổi; đẩy mạnh tập quyền và hiện đại hóa nhà nước."}],s:["wy","bp"]},
{id:"admin",ch:1,L:"ed",t:"Cải cách hành chính: tập quyền về trung ương",lead:"Từ thập niên 1870, nhà vua dựng bộ máy nhà nước kiểu mới.",img:"historical_documents",
 p:["1874: lập Hội đồng Nhà nước và Hội đồng Cơ mật.","1892: tổ chức các bộ chuyên trách thay cơ cấu cũ.","Quản lý tỉnh trực tiếp từ Bangkok, giảm quyền của quý tộc địa phương.","Xây dựng quân đội và quan chức thường trực, có cố vấn nước ngoài."],s:["wy","bp"]},
{id:"economy",ch:1,L:"pc",h:1,bgv:"siam_reform",t:"Kinh tế và giao thông: mở cửa có kiểm soát",
 st:["1855: Hiệp ước Bowring mở rộng thương mại tự do","Gạo thành mặt hàng xuất khẩu chủ lực","Điện tín và đường sắt: tuyến Bangkok–Khorat khai thông năm 1900","Củng cố quyền kiểm soát vùng biên viễn"],
 res:"Kinh tế gắn với thị trường thế giới",note:"Giới hạn: thuế nhập khẩu bị hạn chế, thương nhân và tư bản nước ngoài giữ vai trò lớn.",s:["wy","bp"]},
{id:"society",ch:1,L:"vt",img:"historical_school_siam",t:"Giáo dục, pháp luật và xã hội",
 r:[["1873","Bỏ nghi thức quỳ lạy trước nhà vua"],["1874","Ban hành luật từng bước xóa chế độ nô lệ"],["1892","Lập Bộ Giáo dục, mở rộng trường học"],["1905","Chính thức bãi bỏ chế độ nô lệ"],["1908","Ban hành Bộ luật Hình sự theo mô hình hiện đại"]],note:"Pháp luật hiện đại còn nhằm thuyết phục các nước bỏ đặc quyền lãnh sự.",s:["wy","bp"]},
{id:"diplomacy",ch:1,L:"doc",t:"Ngoại giao và nhượng bộ lãnh thổ",
 d:[["1855","Hiệp ước Bowring","Mở thương mại với Anh, hạn chế thuế nhập khẩu, thừa nhận đặc quyền lãnh sự.","bowring_treaty_document"],["1893","Khủng hoảng Pháp–Xiêm","Pháp dùng tàu chiến ép Xiêm (7/1893); Xiêm nhượng toàn bộ tả ngạn sông Mê Kông.","franco_siamese_crisis_1893"],["1896","Tuyên bố Anh–Pháp","Hai nước cam kết tôn trọng lưu vực sông Chao Phraya, tạo vùng đệm giữa hai thuộc địa."],["1904–07","Hiệp ước với Pháp","1904: nhượng đất hữu ngạn Mê Kông (đối diện Luang Prabang, Champasak). 1907: nhượng Battambang, Siem Reap, Sisophon; nhận lại Trat và Dan Sai."],["1909","Hiệp ước Anh–Xiêm","Xiêm chuyển quyền kiểm soát Kedah, Kelantan, Terengganu, Perlis cho Anh.","anglo_siamese_treaty_1909"]],
 note:"Các hiệp ước Pháp–Xiêm 1893, 1904, 1907 đã đối chiếu với văn bản trong hồ sơ ICJ.",s:["wy","bp","th","icj"]},
{id:"independence",ch:1,L:"sp",t:"Độc lập chính thức, nhưng có điều kiện",
 c:[["Giữ được","Chủ quyền hình thức, ngai vàng, bộ máy nhà nước do người Xiêm điều hành, vùng lõi lãnh thổ."],["Phải trả","Các vùng đất ở Lào, Campuchia và phía nam; đặc quyền lãnh sự và hạn chế thuế quan kéo dài."],["Vì sao giữ được","Cải cách bên trong, ngoại giao linh hoạt, cạnh tranh Anh–Pháp và bối cảnh quốc tế. Vị trí vùng đệm chưa đủ để giải thích."]],s:["wy","bp","th"]},
{id:"insights",ch:2,L:"sp",n:2,t:"Những chi tiết ít được chú ý",
 c:[["Tên gọi","Xiêm đổi tên thành Thái Lan năm 1939 (dùng lại tên Xiêm 1945, tên Thái Lan chính thức từ 1949); Miến Điện thành Myanmar năm 1989. Dùng tên theo ngữ cảnh lịch sử."],["Cải cách từ trên xuống","Cải cách củng cố vương quyền cùng lúc với hiện đại hóa."],["Biên giới","Thongchai cho rằng khái niệm lãnh thổ hiện đại của Xiêm hình thành qua bản đồ và đàm phán biên giới."],["Sử học tranh luận","Sử gia vẫn bàn về phần của cải cách chủ động so với hoàn cảnh địa chính trị."]],s:["th","wy","bp"]},
{id:"quiz",ch:2,L:"qz",t:"Kiểm tra kiến thức",q:"Cách giải thích nào đầy đủ nhất cho việc Xiêm giữ được độc lập chính thức?",
 o:["Chỉ do là vùng đệm giữa Anh và Pháp","Chỉ do cải cách bên trong","Kết hợp cải cách, ngoại giao, cạnh tranh Anh–Pháp và nhượng bộ","Do Xiêm không chịu sức ép nào"],a:2,note:"Bấm vào một đáp án để xem đúng/sai. Nội dung mẫu; phần trả lời cho khán giả làm ở giai đoạn sau.",s:["wy","bp"]},
{id:"ending",ch:2,L:"hero",v:"ending_history",end:1,t:"Độc lập có giá, thuộc địa có nhiều dạng",k:"Tổng kết",
 p:["Xâm lược khác nhau về <b>thời điểm</b> và <b>mức độ</b> hoàn tất.","Xiêm giữ <b>độc lập chính thức</b> và đánh đổi bằng <b>nhượng bộ</b>.","Giải thích lịch sử cần <b>nhiều nguyên nhân</b>, không chỉ một."],s:Object.keys(SRC)}
];

/* ===== ẢNH/VIDEO: tên file ở thư mục gốc. Ảnh thử .png/.jpg/.jpeg/.webp; poster thử .jpg/.png/.jpeg/.webp ===== */
const vtag=n=>`<video muted playsinline preload="none" disablepictureinpicture data-v="${n}"></video>`;
const fimg=(f,alt="")=>`<img data-f="${f}" alt="${alt}" hidden>`;
const li=a=>a.map(x=>`<li class="a">${x}</li>`).join(""),nt=s=>s.note?`<p class="a note">${s.note}</p>`:"";
const ttl=s=>`<h2 class="a t">${s.t}</h2>`;
const ENDBAR=`<div class="a endbar"><button data-act="home">↺ Về đầu</button><button data-act="end">Kết thúc trình chiếu</button></div>`;

/* ===== LAYOUT: mỗi loại slide một renderer ===== */
const R={
hero:s=>`<div class="bg ${s.earth?"earth":"army"}">${vtag(s.v)}</div><div class="shade"></div>${s.geo?`<p class="a geo">${s.geo}</p>`:""}<div class="hc"><h1 class="a t">${s.t}</h1><p class="a k">${s.k}</p>${s.p?`<ul class="a sum">${s.p.map(x=>`<li>${x}</li>`).join("")}</ul>`:""}${s.end?ENDBAR:""}</div>`,
ed:s=>`<div class="ed"><div>${ttl(s)}<p class="a lead">${s.lead}</p><figure class="a fr">${fimg(s.img,s.t)}</figure></div><ul>${li(s.p)}</ul></div>`,
pc:s=>`<div class="pc${s.h?" h":""}">${ttl(s)}<ol>${li(s.st)}</ol><p class="a res">${s.res}</p>${nt(s)}</div>`,
tl:s=>`${ttl(s)}<div class="tl"><i class="line"></i>${s.r.map(([y,x,p])=>`<div class="a n p${p}"><b>${y}</b><span>${x}</span><em>${PH[p]}</em></div>`).join("")}</div>`,
map:s=>`<div class="mp"><figure class="a fr big">${fimg(s.img,s.t)}<figcaption>${s.cap}</figcaption></figure><div>${ttl(s)}<ul class="lg">${s.lg.map(([a,b,c],i)=>`<li class="a" style="--c:var(--c${i})"><b>${c} ${a}:</b> ${b}</li>`).join("")}</ul></div></div>`,
pr:s=>`${ttl(s)}<div class="pr">${s.p.map(p=>`<article class="a"><div class="fr" data-m="${p.m}">${fimg("portrait_"+p.m,p.n)}</div><h3>${p.n}</h3><p class="yr">${p.y}</p><p>${p.d}</p></article>`).join("")}</div>`,
sp:s=>`${ttl(s)}<div class="sp" style="--n:${s.n||s.c.length}">${s.c.map(([h,x])=>`<section class="a"><h3>${h}</h3><p>${x}</p></section>`).join("")}</div>${nt(s)}`,
vt:s=>`<div class="vt">${ttl(s)}<ol>${s.r.map(([y,x])=>`<li class="a"><b>${y}</b><span>${x}</span></li>`).join("")}</ol>${s.img?`<figure class="a fr opt side">${fimg(s.img,s.t)}</figure>`:""}${nt(s)}</div>`,
doc:s=>`${ttl(s)}<div class="dc">${s.d.map(([y,h,x,im],i)=>`<article class="a" style="--r:${i%2?.8:-.8}deg">${im?`<figure class="fr opt th">${fimg(im,h)}</figure>`:""}<b>${y}</b><h3>${h}</h3><p>${x}</p></article>`).join("")}</div>${nt(s)}`,
qz:s=>`${ttl(s)}<p class="a lead">${s.q}</p><ol class="qo">${s.o.map((x,i)=>`<li class="a" data-ok="${i===s.a?1:0}">${x}</li>`).join("")}</ol>${nt(s)}`
};
const bgv=s=>s.bgv&&!perf&&!RM?`<div class="bgv">${vtag(s.bgv)}</div>`:"";

/* ===== ĐIỀU HƯỚNG + CHUYỂN CẢNH ===== */
const stage=$("#stage");
function goTo(i,o={}){
  i=Math.max(0,Math.min(S.length-1,Math.trunc(i)||0));
  if(i===cur)return;
  clearTimeout(autoT);
  const prevCh=cur>=0?S[cur].ch:null,s=S[i],old=stage.querySelector(".scene:not(.out)"),w=$("#wipe");
  cur=i;freeModels();
  if(old){const slow=old.classList.contains("L-hero")&&!perf&&!RM;stopMedia(old);old.classList.add("out");setTimeout(()=>old.remove(),(perf||RM)?0:slow?700:380)}
  const chapter=prevCh!==null&&prevCh!==s.ch&&!perf&&!RM;
  w.className="";if(chapter){void w.offsetWidth;w.className=s.ch%2?"go":"go v"}
  const el=document.createElement("section");
  el.className="scene L-"+s.L+(s.auto?" auto":"")+(s.end?" end":"")+(chapter?" chap":"");
  el.dataset.id=s.id;el.dataset.i=i;el.setAttribute("role","group");el.setAttribute("aria-label",s.t);
  el.innerHTML=bgv(s)+R[s.L](s);
  el.querySelectorAll(".a").forEach((n,k)=>n.style.setProperty("--i",Math.min(k,9)));
  stage.appendChild(el);hydrate(el);
  el._tm=setTimeout(()=>{ // chỉ chạy nếu scene này vẫn là scene hiện tại (chống chuyển nhanh)
    if(cur!==i||!el.isConnected)return;
    el.classList.add("in");el.querySelectorAll("video[data-v]").forEach(v=>startVideo(v));initModels(el,i);
  },chapter?420:16);
  preload(i+1);updateUI();
  try{history.replaceState(null,"","#"+(i+1))}catch(e){}
  if(!o.silent&&CONTROL)push(i);
}
const next=()=>goTo(cur+1),prev=()=>goTo(cur-1);
function preload(i){const s=S[i];if(!s)return;[...(R[s.L](s).matchAll(/data-f="([^"]+)"/g))].forEach(m=>probe(m[1],IMG_EXT))}
function updateUI(){
  const s=S[cur],pct=Math.round((cur+1)/S.length*100);
  $("#progress i").style.width=pct+"%";$("#progress").setAttribute("aria-valuenow",pct);
  $("#chapter").textContent=CH[s.ch];$("#count").textContent=(cur+1)+" / "+S.length;
  if(!$("#panel").hidden)srcPanel();
  document.querySelectorAll("#menu button").forEach((b,k)=>{b.classList.toggle("cur",k===cur);k===cur?b.setAttribute("aria-current","true"):b.removeAttribute("aria-current")});
  vc();dbg();
}
function srcPanel(){
  $("#panel").innerHTML="<b>Nguồn tham khảo của slide này</b><ul>"+S[cur].s.map(k=>"<li>"+SRC[k]+"</li>").join("")+"</ul><p>Mốc thời gian và tên riêng đã đối chiếu với các nguồn trên; xem README mục N về giới hạn kiểm chứng.</p>";
}
function buildMenu(){$("#menu").innerHTML=S.map((s,i)=>`<button data-i="${i}">${i+1}. ${s.t}</button>`).join("")}

/* ===== ẢNH: dò đuôi file, nhớ kết quả để không lặp lỗi 404 ===== */
function probe(base,exts){
  return new Promise(ok=>{
    if(base in FOUND)return ok(FOUND[base]);
    let k=0;const t=new Image();
    const nx=()=>{if(k>=exts.length){FOUND[base]=false;return ok(false)}t.src=asset(base+"."+exts[k++])};
    t.onload=()=>{FOUND[base]=t.src;ok(t.src)};t.onerror=nx;nx();
  });
}
function hydrate(root){
  root.querySelectorAll("img[data-f]").forEach(async img=>{
    const f=img.dataset.f,u=await probe(f,IMG_EXT);
    if(!img.isConnected)return;
    const fr=img.parentElement;
    if(u){img.src=u;img.hidden=false;fr.classList.remove("missing")}
    else{img.hidden=true;fr.classList.add("missing");fr.dataset.f=f;log("ảnh",f+".(png|jpg|jpeg|webp) chưa có")}
  });
  root.querySelectorAll("video[data-v]").forEach(async v=>{
    const u=await probe(v.dataset.v+"_poster",POS_EXT);
    if(u&&v.isConnected&&!v.ended)v.poster=u;
  });
}

/* ===== VIDEO: chỉ phát ở scene hiện tại; dừng và giải phóng khi rời; luôn muted, không loop ===== */
function startVideo(v){
  const n=v.dataset.v;
  if(v.closest(".bgv")&&(perf||RM))return;
  if(VIDX[n]===false){v.hidden=true;return vc()}
  if(RM&&!v.dataset.go){vc();return}               // giảm chuyển động: chờ người trình chiếu bấm "Phát video"
  if(!v.getAttribute("src"))v.src=asset(n+".mp4");
  v.loop=false;v.muted=true;delete v.dataset.blocked;
  const p=v.play();vc();
  if(p&&p.catch)p.catch(e=>{if(e.name==="NotAllowedError"){v.dataset.blocked="1";log("video",n+".mp4: autoplay bị chặn, dùng nút Phát video")}vc()});
}
function stopMedia(root){
  clearTimeout(root._tm);
  root.querySelectorAll("video").forEach(v=>{v.pause();v.removeAttribute("src");v.load()});
  freeModels();
}
function heroVideo(){return stage.querySelector(".scene:not(.out) .bg video")}
function vc(){ // nút Bỏ qua / Phát video của scene hero
  const b=$("#vctl");if(!b)return;
  const v=heroVideo();let a="";
  if(v&&!v.hidden&&VIDX[v.dataset.v]!==false&&!v.ended)a=v.paused?"play":"skip";
  b.hidden=!a;b.dataset.a=a;b.textContent=a==="skip"?"Bỏ qua video ›":"▶ Phát video";dbg();
}
function skipVideo(){
  const v=heroVideo();if(!v)return;
  const sc=v.closest(".scene");
  if(v.paused||!v.getAttribute("src")){v.dataset.go="1";return startVideo(v)}   // đang chờ: bấm để phát
  if(sc.classList.contains("auto"))return next();
  if(isFinite(v.duration)&&v.seekable.length){v.currentTime=Math.max(0,v.duration-.04);setTimeout(()=>{if(heroVideo()===v&&!v.ended&&!v.paused){v.pause();vc()}},800)} // nhảy tới khung cuối, giữ nguyên tiêu đề
  else{v.pause();vc()}                                                // file không tua được: dừng tại chỗ
}
["playing","pause","ended","error","emptied"].forEach(t=>stage.addEventListener(t,e=>{
  const v=e.target;if(!v||v.tagName!=="VIDEO")return;
  const n=v.dataset.v;
  if(t==="playing")VIDX[n]=true;
  if(t==="error"&&v.getAttribute("src")){VIDX[n]=false;v.hidden=true;log("video",n+".mp4 chưa có hoặc lỗi giải mã, dùng nền dự phòng")}
  if(t==="ended"){
    const sc=v.closest(".scene");
    if(sc&&sc.classList.contains("auto")&&!sc.classList.contains("out")&&+sc.dataset.i===cur&&!RM&&v.closest(".bg")){const i=cur;clearTimeout(autoT);autoT=setTimeout(()=>{if(cur===i)next()},900)}
  }
  vc();
},true));
document.addEventListener("visibilitychange",()=>{
  const vs=stage.querySelectorAll("video");
  if(document.hidden)vs.forEach(v=>{if(!v.paused&&!v.ended){v.dataset.rs="1";v.pause()}});
  else vs.forEach(v=>{if(v.dataset.rs){delete v.dataset.rs;v.play().catch(()=>{})}});
  vc();
});

/* ===== MÔ HÌNH 3D: chỉ khởi tạo khi scene có model và file .glb tồn tại; fallback ảnh chân dung ===== */
const ld=u=>new Promise((ok,no)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>no(new Error("không tải được "+u));document.head.appendChild(s)});
async function hasFile(f){
  if(f in GLB)return GLB[f];
  try{const r=await fetch(asset(f),{method:"HEAD"});GLB[f]=r.ok}catch(e){GLB[f]=false}
  return GLB[f];
}
async function initModels(root,i){
  if(!CONFIG.useModels||perf)return;
  let boxes=[...root.querySelectorAll("[data-m]")];
  if(!boxes.length)return;
  const ok=await Promise.all(boxes.map(b=>hasFile(b.dataset.m+".glb")));
  boxes=boxes.filter((b,k)=>{if(!ok[k])log("model",b.dataset.m+".glb chưa có, dùng ảnh chân dung");return ok[k]});
  if(!boxes.length||cur!==i)return;
  try{
    if(!window.THREE){await ld(T3);await ld(GL)}
    const c=document.createElement("canvas");
    if(!(c.getContext("webgl2")||c.getContext("webgl")))throw Error("WebGL không khả dụng");
  }catch(e){return log("model",e.message||"không tải được Three.js")}
  if(cur!==i)return;
  boxes.forEach(b=>{
    if(!b.isConnected)return;
    try{
      const w=b.clientWidth||330,h=b.clientHeight||520,r=new THREE.WebGLRenderer({alpha:true,antialias:true}),sc=new THREE.Scene(),
        cam=new THREE.PerspectiveCamera(35,w/h,.1,100),g=new THREE.Group(),m={r,sc,raf:0,dead:false},dl=new THREE.DirectionalLight(0xffe3b0,1.1);
      r.setSize(w,h);r.setPixelRatio(Math.min(devicePixelRatio,2));cam.position.set(0,.3,5);dl.position.set(2,3,4);
      sc.add(g,dl,new THREE.HemisphereLight(0xfff1d6,0x221a10,1.2));
      new THREE.GLTFLoader().load(asset(b.dataset.m+".glb"),gl=>{
        if(!b.isConnected||cur!==i){r.dispose();return}
        const o=gl.scene,bx=new THREE.Box3().setFromObject(o);
        o.position.sub(bx.getCenter(new THREE.Vector3()));g.add(o);g.scale.setScalar(3/(bx.getSize(new THREE.Vector3()).length()||1));
        b.appendChild(r.domElement);b.classList.add("live");M.push(m);
        const loop=()=>{if(m.dead)return;m.raf=requestAnimationFrame(loop);if(!RM)g.rotation.y+=.004;r.render(sc,cam)};loop();
      },undefined,()=>{r.dispose();log("model",b.dataset.m+".glb lỗi khi đọc, dùng ảnh chân dung")});
    }catch(e){log("model",e.message)}
  });
}
function freeModels(){
  M.forEach(m=>{m.dead=true;cancelAnimationFrame(m.raf);m.sc.traverse(o=>{o.geometry&&o.geometry.dispose();o.material&&[].concat(o.material).forEach(x=>x.dispose())});m.r.dispose();m.r.forceContextLoss&&m.r.forceContextLoss();m.r.domElement.remove()});
  M=[];
}

/* ===== APPWRITE (tùy chọn): chỉ đồng bộ số trang 0-based, không đồng bộ video/animation/menu ===== */
const rowRef=()=>({databaseId:CONFIG.appwriteDatabase,tableId:CONFIG.appwriteTable,rowId:CONFIG.appwriteRow});
async function initSync(){
  if(!CONFIG.appwriteProject||!CONFIG.appwriteDatabase||!CONFIG.appwriteTable)return;
  const A=window.Appwrite;
  if(!A||!A.Client||!A.TablesDB){syncState="disconnected (không tải được Appwrite SDK, chạy local)";return log("appwrite","thiếu Appwrite SDK (CDN bị chặn hoặc offline)")}
  try{
    client=new A.Client().setEndpoint(CONFIG.appwriteEndpoint).setProject(CONFIG.appwriteProject);
    db=new A.TablesDB(client);syncState="connecting";dbg();
  }catch(e){syncState="disconnected (lỗi khởi tạo)";return log("appwrite",e.message||String(e))}
  await connect();
}
async function connect(){            // đăng ký realtime (nếu chưa) rồi đồng bộ trang hiện tại
  if(!db)return;
  const A=window.Appwrite;
  if(!sub){
    const ch="tablesdb."+CONFIG.appwriteDatabase+".tables."+CONFIG.appwriteTable+".rows."+CONFIG.appwriteRow;
    const cb=r=>{if(r&&Array.isArray(r.events)&&r.events.some(e=>/\.update$/.test(e))&&!r.events.some(e=>/\.delete$/.test(e)))apply(r.payload)};
    try{
      if(A.Realtime){rt=new A.Realtime(client);sub=await rt.subscribe(ch,cb)}
      else sub=client.subscribe(ch,cb);                       // SDK cũ hơn
    }catch(e){syncState="disconnected (realtime: "+(e.message||e)+")";dbg();return log("appwrite","realtime: "+(e.message||e))}
  }
  const ok=await pull(!CONTROL);
  if(ok&&CONTROL)doPush(cur,true);                         // máy điều khiển là nguồn đúng
}
async function pull(applyIt=true){
  if(!db)return false;
  try{
    const r=await db.getRow(rowRef());
    syncState="connected";dbg();
    if(applyIt)apply(r);
    return true;
  }catch(e){syncState="disconnected ("+(e.message||e)+")";log("appwrite",e.message||String(e));dbg();return false}
}
function apply(r){if(r&&r.controller_id!==CLIENT&&Number.isInteger(r.page)&&r.page>=0&&r.page<S.length)goTo(r.page,{silent:true})} // silent: không ghi ngược, không vòng lặp
function push(i){clearTimeout(pushT);pushT=setTimeout(()=>doPush(i),120)}  // gộp các lần chuyển nhanh thành một lần ghi
async function doPush(i,force){
  if(!db||!syncState.startsWith("connected")||i<0||(i===lastPushed&&!force))return; // không ghi lặp cùng một trang
  lastPushed=i;
  try{await db.updateRow(Object.assign(rowRef(),{data:{page:i,controller_id:CLIENT}}))}
  catch(e){log("appwrite",e.message||String(e))}
}
function closeSync(){
  try{if(sub){typeof sub==="function"?sub():sub.close&&sub.close()}if(rt&&rt.disconnect)rt.disconnect()}catch(e){}
  sub=null;rt=null;
}

/* ===== ĐIỀU KHIỂN, DEBUG, HIỆU NĂNG ===== */
const fsOK=!!document.documentElement.requestFullscreen;
const fs=()=>{try{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();p&&p.catch&&p.catch(()=>{})}catch(e){}};
const hide=()=>document.body.classList.toggle("off");
function tg(id,force){
  const e=$("#"+id);e.hidden=force===undefined?!e.hidden:!force;
  if(id==="debug")document.documentElement.classList.toggle("debug",!e.hidden);
  if(id==="panel"&&!e.hidden)srcPanel();
  if(id==="menu"){$("#menuBtn").setAttribute("aria-expanded",!e.hidden);if(!e.hidden){const b=e.querySelector(".cur");b&&b.focus()}}
  dbg();
}
function dbg(){
  const d=$("#debug");if(!d||d.hidden)return;
  const vs=[...document.querySelectorAll("video[data-v]")].map(v=>v.dataset.v+(v.hidden?" lỗi/thiếu":v.paused?" dừng":" phát")).join(", ")||"không có";
  d.textContent=["Scene: "+(cur+1)+"/"+S.length+" ("+S[cur].id+")","Appwrite: "+syncState+(CONTROL?" [điều khiển]":" [máy xem]"),"Performance mode: "+(perf?"bật":"tắt")+" | Reduced motion: "+(RM?"bật":"tắt"),
    "Base path: "+BASE_PATH,"Video: "+vs,"Thiếu/lỗi tài nguyên ("+errs.length+"):"].concat(errs.slice(-10)).join("\n");
}
function setPerf(){document.documentElement.classList.toggle("perf",perf);$("#perfBtn").setAttribute("aria-pressed",perf)}
function fit(){document.documentElement.style.setProperty("--s",Math.min(innerWidth/1920,innerHeight/1080))}
function key(e){
  if(e.ctrlKey&&e.shiftKey&&e.code==="KeyD"){e.preventDefault();return tg("debug")}
  const t=e.target;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable||e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key,ep=$("#endp");
  if(!ep.hidden){ep.hidden=true;e.preventDefault();return}
  if(k===" "&&t.closest&&t.closest("button"))return; // để nút tự xử lý phím cách
  const navKeys={ArrowRight:next,PageDown:next," ":next,ArrowLeft:prev,PageUp:prev,Backspace:prev,Home:()=>goTo(0),End:()=>goTo(S.length-1)};
  if(navKeys[k]){e.preventDefault();if(!e.repeat)navKeys[k]();return}
  const act={f:fs,F:fs,h:hide,H:hide,s:()=>tg("panel"),S:()=>tg("panel"),m:()=>tg("menu"),M:()=>tg("menu"),k:skipVideo,K:skipVideo,
    Escape:()=>{tg("panel",false);tg("menu",false)}}[k];
  if(act){e.preventDefault();if(!e.repeat)act()}
}
function endShow(){if(document.fullscreenElement)fs();$("#endp").hidden=false;$("#endp button").focus()}
function bindUI(){
  $("#prev").onclick=prev;$("#next").onclick=next;$("#fsBtn").onclick=fs;$("#hideBtn").onclick=hide;
  if(!fsOK)$("#fsBtn").hidden=true;
  $("#menuBtn").onclick=()=>tg("menu");$("#srcBtn").onclick=()=>tg("panel");
  $("#perfBtn").onclick=()=>{perf=!perf;ls.set("perf",perf?"1":"0");setPerf();dbg()};
  $("#menu").onclick=e=>{const b=e.target.closest("button");if(b){goTo(+b.dataset.i);tg("menu",false)}};
  $("#vctl").onclick=skipVideo;
  $("#endp button").onclick=()=>{$("#endp").hidden=true;goTo(0)};
  stage.addEventListener("click",e=>{
    const b=e.target.closest("[data-act]");
    if(b){b.dataset.act==="home"?goTo(0):endShow();return}
    const o=e.target.closest(".qo li");
    if(o){const ol=o.parentElement;ol.classList.add("done");ol.querySelectorAll("li").forEach(x=>x.classList.toggle("ok",x.dataset.ok==="1"));if(o.dataset.ok!=="1")o.classList.add("no")}
  });
  let x0=0,y0=0,multi=false;const app=$("#app");
  app.addEventListener("touchstart",e=>{multi=e.touches.length>1;x0=e.touches[0].clientX;y0=e.touches[0].clientY},{passive:true});
  app.addEventListener("touchend",e=>{if(multi)return;const t=e.changedTouches[0],dx=t.clientX-x0;if(Math.abs(dx)>70&&Math.abs(t.clientY-y0)<60)dx<0?next():prev()},{passive:true});
  addEventListener("keydown",key);addEventListener("resize",fit);addEventListener("orientationchange",fit);
  document.addEventListener("fullscreenchange",()=>{fit();$("#fsBtn").textContent=document.fullscreenElement?"Thoát toàn màn hình":"Toàn màn hình"});
  addEventListener("hashchange",()=>{const h=parseInt(location.hash.slice(1),10);if(h>0)goTo(h-1)});
  addEventListener("offline",()=>{if(db){syncState="disconnected (offline)";dbg()}});
  addEventListener("online",()=>{if(db)connect()});
  addEventListener("pagehide",closeSync);
  addEventListener("pageshow",e=>{if(e.persisted&&db)connect()});
}
function boot(){
  fit();
  const sv=ls.get("perf");perf=sv==="1"||(sv===null&&((navigator.hardwareConcurrency||4)<=2||(navigator.deviceMemory||4)<=2));setPerf();
  buildMenu();bindUI();
  const h=parseInt(location.hash.slice(1),10);
  goTo(h>0?h-1:0);
  $("#loading").remove();
  initSync();
}
try{boot()}catch(e){log("khởi động",e.message);$("#err").hidden=false;const l=$("#loading");if(l)l.remove()}
