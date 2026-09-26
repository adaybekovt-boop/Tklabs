"use client";

import { useEffect, type RefObject } from "react";
import { HOME_SCENES, clamp, mix, sceneProgress } from "./scene-progress";

type Pose = { x: number; y: number; scale: number; rotate?: number };
type Keyframe = Pose & { at: number };

/** Native scroll is the playhead. One owner, cached layout, no idle animation loop. */
export function useHomeFilm(ref: RefObject<HTMLDivElement | null>, locale: string) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const cinematic = matchMedia("(min-width: 600px) and (min-height: 600px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose = () => {};

    function configure() {
      dispose();
      if (!root || reduced.matches) return;
      const q = (name: string) => root.querySelector<HTMLElement>(`[data-film-${name}]`)!;
      const system = root.querySelector<HTMLElement>("[data-task-system]")!;
      const hero = q("hero"), prompt = q("prompt"), route = q("route"), model = q("model");
      const answer = q("answer"), tool = q("tool"), archive = q("archive"), version = q("version");
      const intent = q("intent"), framePlane = q("window"), chrome = q("chrome");
      const draft = q("draft"), checklist = q("checklist"), progress = q("progress");
      const captions = [...root.querySelectorAll<HTMLElement>("[data-film-caption]")];
      const chapters = [...root.querySelectorAll<HTMLElement>("[data-film-chapter]")];
      const lines = [...hero.querySelectorAll<HTMLElement>("h1>span")];
      const nodes = [...route.querySelectorAll<HTMLElement>(".route-model")];
      const main = root.closest("main")!;
      const quiet = [...main.querySelectorAll<HTMLElement>(".home-quiet>div>span")];
      const ending = [...main.querySelectorAll<HTMLElement>(".ending-mark>span")];
      const workbench = main.querySelector<HTMLElement>(".version-workbench")!;
      const transformed = [system, hero, prompt, route, model, answer, tool, archive, version, intent, framePlane, chrome, draft, checklist, progress, ...captions, ...lines, ...nodes, ...quiet, ...ending, workbench];
      const boxes = new Map<HTMLElement, DOMRect>();
      const documentTops = new Map<HTMLElement, number>();
      const film = cinematic.matches;
      let width = 1, height = 1, originX = 0, originY = 0, scale = 1;
      let start = 0, distance = 1, raf = 0, lastTime = 0, alive = true;
      let scroll = window.scrollY;
      if (film) root.dataset.cinematic = "true";
      else root.dataset.mobileMotion = "true";

      const opacity = (el: HTMLElement, value: number) => { el.style.opacity = String(clamp(value)); };
      const transform = (el: HTMLElement, value: string) => { el.style.transform = value; };
      const reveal = (el: HTMLElement, value: number) => { el.style.clipPath = `inset(0 ${100 * (1-clamp(value))}% 0 0)`; };
      const fade = (p: number, a: number, b: number, c = 2, d = 3) => sceneProgress(p,a,b)*(1-sceneProgress(p,c,d));
      function finalPose(el: HTMLElement): Pose {
        const b = boxes.get(el)!;
        return { x: originX + b.x * scale, y: originY + b.y * scale, scale };
      }
      function place(el: HTMLElement, pose: Pose) {
        const b = boxes.get(el)!;
        transform(el, `translate3d(${(pose.x-originX)/scale-b.x}px,${(pose.y-originY)/scale-b.y}px,0) scale(${pose.scale/scale}) rotate(${pose.rotate ?? 0}deg)`);
      }
      function track(el: HTMLElement, p: number, frames: Keyframe[]) {
        let next = frames.findIndex(frame => frame.at >= p);
        if (next === -1) next = frames.length-1;
        const a = frames[Math.max(0,next-1)], b = frames[next];
        const t = b.at === a.at ? 1 : sceneProgress(p,a.at,b.at);
        const ease = t*t*(3-2*t);
        place(el, {x:mix(a.x,b.x,ease),y:mix(a.y,b.y,ease),scale:mix(a.scale,b.scale,ease),rotate:mix(a.rotate??0,b.rotate??0,ease)});
      }
      function entrance(el: HTMLElement, offset = 0) {
        return clamp((scroll + innerHeight - (documentTops.get(el) ?? 0) - offset) / (innerHeight*.65));
      }
      function paint() {
        for (const [i, word] of quiet.entries()) {
          const enter = entrance(word, i*22);
          transform(word, `translate3d(${(1-enter)*(i===1?-70:70)}px,${(1-enter)*35}px,0)`);
          opacity(word, .15+.85*enter);
        }
        const documentEntry = entrance(workbench);
        transform(workbench, `translate3d(${(1-documentEntry)*90}px,${(1-documentEntry)*30}px,0) rotate(${(1-documentEntry)*2}deg)`);
        opacity(workbench, .25+.75*documentEntry);
        ending.forEach((letter,i) => {
          const enter = entrance(letter,i*25);
          transform(letter, `translate3d(${(i-1.5)*(1-enter)*100}px,${(1-enter)*(i%2?75:-75)}px,0) rotate(${(i-1.5)*(1-enter)*7}deg) scale(${.75+.25*enter})`);
          opacity(letter, .12+.88*enter);
        });
        if (!film) {
          const r = entrance(route, 50);
          root!.style.setProperty("--route-draw", String(1-r));
          transform(prompt, `translate3d(0,${(1-entrance(prompt))*45}px,0) scale(${.94+.06*entrance(prompt)})`);
          transform(tool, `translate3d(${(1-entrance(tool))*65}px,0,0)`);
          transform(answer, `translate3d(${(1-entrance(answer))*-35}px,${(1-entrance(answer))*25}px,0)`);
          captions.forEach((caption,i) => {
            const enter = entrance(caption,20);
            transform(caption, `translate3d(${(1-enter)*(i%2?-40:40)}px,${(1-enter)*25}px,0)`);
            opacity(caption,.18+.82*enter);
          });
          return;
        }
        const p = clamp((scroll-start)/distance);
        const compact = width < 1100;
        const visualLeft = compact ? width*.08 : width*.39;
        const visualWidth = compact ? width*.84 : width*.56;
        const visualTop = compact ? 133 : height*.17;
        const contentScale = Math.min(compact ? 1.14 : 1.25, visualWidth/boxes.get(prompt)!.width);
        const end = (el: HTMLElement,at:number):Keyframe => ({at,...finalPose(el)});
        transform(system, `translate3d(${originX}px,${originY}px,0) scale(${scale})`);

        const heroExit = sceneProgress(p,.025,.15);
        opacity(hero,1-sceneProgress(p,.06,.15));
        hero.inert = p > .12;
        lines.forEach((line,i) => transform(line,`translate3d(${-heroExit*(180+i*90)}px,${-heroExit*(45+i*30)}px,0) rotate(${-heroExit*(2+i)}deg)`));
        track(prompt,p,[
          {at:0,x:compact?width*.20:width*.55,y:compact?height*.52:height*.43,scale:compact?.90:Math.min(.96,width*.4/boxes.get(prompt)!.width),rotate:-3},
          {at:.16,x:visualLeft,y:visualTop+70,scale:contentScale,rotate:0},
          {at:.25,x:visualLeft+visualWidth*.08,y:visualTop-10,scale:contentScale*.82},
          {at:.37,x:visualLeft+visualWidth*.1,y:visualTop-32,scale:contentScale*.7},
          end(prompt,.49),end(prompt,1)
        ]);
        opacity(prompt,1-sceneProgress(p,.36,.405)+sceneProgress(p,.87,.93));
        const intentPose = {x:visualLeft,y:visualTop+70+boxes.get(prompt)!.height*contentScale+28,scale:compact?.78:.94};
        place(intent,intentPose); opacity(intent,fade(p,.13,.19,.22,.26));
        const routeScale = visualWidth/boxes.get(route)!.width;
        track(route,p,[{at:.20,x:visualLeft+80,y:visualTop+180,scale:routeScale*.75,rotate:5},{at:.28,x:visualLeft,y:visualTop+112,scale:routeScale},{at:.36,x:visualLeft,y:visualTop+112,scale:routeScale},{at:.43,x:finalPose(model).x,y:finalPose(model).y-30,scale:routeScale*.35,rotate:-4}]);
        opacity(route,fade(p,.21,.27,.36,.435));
        root!.style.setProperty("--route-draw",String(1-sceneProgress(p,.26,.355)));
        nodes.forEach((node,i) => {
          const leave = sceneProgress(p,.35,.42);
          const selected = node.dataset.selected === "true";
          transform(node,`translate3d(${selected?0:(i-1)*leave*100}px,${selected?-leave*45:leave*50}px,0) scale(${selected?1+leave*.2:1-leave*.3})`);
          opacity(node,selected?1:1-leave);
        });
        opacity(model,sceneProgress(p,.74,.80));
        track(model,p,[{at:.39,x:visualLeft+visualWidth*.4,y:visualTop+170,scale:1.5},end(model,.50),end(model,1)]);
        track(answer,p,[{at:.36,x:width+30,y:visualTop+80,scale:1.15,rotate:8},{at:.47,x:visualLeft,y:visualTop+10,scale:contentScale,rotate:0},{at:.57,x:visualLeft,y:visualTop+10,scale:contentScale},end(answer,.72),end(answer,1)]);
        opacity(answer,sceneProgress(p,.37,.435));
        reveal(answer,sceneProgress(p,.37,.46));
        const sourceTop = visualTop+10+boxes.get(answer)!.height*contentScale+30;
        track(tool,p,[{at:.49,x:width+50,y:sourceTop,scale:contentScale,rotate:3},{at:.56,x:visualLeft,y:sourceTop,scale:contentScale,rotate:0},{at:.60,x:visualLeft,y:sourceTop,scale:contentScale},end(tool,.73),end(tool,1)]);
        const sourced = sceneProgress(p,.49,.56);
        opacity(tool,sourced);tool.inert=sourced<.5||p>.63;
        track(archive,p,[{at:.75,x:-boxes.get(archive)!.width,y:originY,scale,rotate:-3},end(archive,.85),end(archive,1)]);
        opacity(archive,sceneProgress(p,.76,.84));
        track(version,p,[{at:.86,x:finalPose(version).x-65,y:finalPose(version).y,scale},end(version,.92),end(version,1)]);
        opacity(version,sceneProgress(p,.87,.92));
        const revise = sceneProgress(p,.825,.87);
        opacity(draft,1-revise);
        transform(draft,`translate3d(${-revise*100}px,0,0)`);
        opacity(checklist,sceneProgress(p,.875,.915));
        transform(checklist,`translate3d(${(1-sceneProgress(p,.875,.915))*45}px,0,0)`);
        reveal(framePlane,sceneProgress(p,.75,.94));
        opacity(framePlane,sceneProgress(p,.75,.83));
        opacity(chrome,sceneProgress(p,.89,.94));
        transform(progress,`scaleX(${p})`);
        captions.forEach(caption => {
          const i = Number(caption.dataset.filmCaption);
          const begin = HOME_SCENES[i], next = HOME_SCENES[i+1]??1.2;
          const incoming = sceneProgress(p,begin-.025,begin+.025), outgoing = sceneProgress(p,next-.04,next);
          const visible = incoming*(1-outgoing);
          opacity(caption,visible);
          transform(caption,`translate3d(${(1-incoming)*-65-outgoing*50}px,${(1-incoming)*45-outgoing*35}px,0)`);
          caption.inert=visible<.4;
          chapters[i].dataset.active=String(p>=begin&&p<next);
        });
      }
      function tick(time:number) {
        raf=0;
        const delta=Math.min(64,time-(lastTime||time-16));lastTime=time;
        scroll+=(window.scrollY-scroll)*(1-Math.exp(-delta/65));
        if(Math.abs(window.scrollY-scroll)<.2)scroll=window.scrollY;
        paint();
        if(scroll!==window.scrollY)raf=requestAnimationFrame(tick);else lastTime=0;
      }
      function schedule(){if(!raf)raf=requestAnimationFrame(tick);}
      function measure(){
        transformed.forEach(el=>el.style.removeProperty("transform"));
        const stage=root!.querySelector<HTMLElement>(".home-film-stage")!;
        width=stage.clientWidth;height=stage.clientHeight;
        root!.style.setProperty("--film-system-width",`${Math.min(1000,width-48)}px`);
        const sr=system.getBoundingClientRect();
        [prompt,route,model,answer,tool,archive,version,intent,framePlane].forEach(el=>{
          const r=el.getBoundingClientRect();boxes.set(el,new DOMRect(r.x-sr.x,r.y-sr.y,r.width,r.height));
        });
        const compact=width<1100;
        originY=compact?120:Math.max(116,height*.18);
        scale=Math.min(1,(height-originY-(compact?155:96))/560,(width*(compact?.91:.8))/sr.width);
        scale=Math.max(.35,scale);
        originX=(width-sr.width*scale)/2+(compact?0:width*.05);
        start=root!.getBoundingClientRect().top+window.scrollY-80;
        distance=Math.max(1,root!.offsetHeight-(innerHeight-80));
        [...quiet,...ending,workbench,prompt,route,tool,answer,...captions].forEach(el=>documentTops.set(el,el.getBoundingClientRect().top+window.scrollY));
        scroll=window.scrollY;paint();
      }
      function jump(event:MouseEvent){
        const a=event.target instanceof Element?event.target.closest('a[href="#task-story"]'):null;
        if(!film||!a||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.button!==0)return;
        event.preventDefault();window.scrollTo({top:start+distance*.17,behavior:"smooth"});
      }
      measure();
      const observer=new ResizeObserver(measure);observer.observe(root);
      window.addEventListener("scroll",schedule,{passive:true});window.addEventListener("resize",measure,{passive:true});root.addEventListener("click",jump);
      document.fonts.ready.then(()=>{if(alive)measure();});
      dispose=()=>{
        alive=false;cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener("scroll",schedule);window.removeEventListener("resize",measure);root.removeEventListener("click",jump);
        delete root.dataset.cinematic;delete root.dataset.mobileMotion;root.style.removeProperty("--route-draw");root.style.removeProperty("--film-system-width");
        transformed.forEach(el=>{el.style.removeProperty("transform");el.style.removeProperty("opacity");el.style.removeProperty("clip-path");el.inert=false;});chapters.forEach(el=>delete el.dataset.active);
      };
    }
    configure();cinematic.addEventListener("change",configure);reduced.addEventListener("change",configure);
    return()=>{dispose();cinematic.removeEventListener("change",configure);reduced.removeEventListener("change",configure);};
  },[ref,locale]);
}
