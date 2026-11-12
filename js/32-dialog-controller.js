try{if(typeof window!=='undefined'&&typeof document!=='undefined')window.__rosterbotRequireBuildComponent('js/32-dialog-controller.js','rb-build:5593aef4a091f5b39740b453879759b12c13ab1f12563e076135efe2ae368b31')}catch(error){throw error}
(function(root){
  'use strict';
  const documentObject=root.document;if(!documentObject)return;
  const records=new WeakMap(),stack=[];
  const focusSelector='button:not([disabled]),[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const priorBackground=new Map();
  const element=value=>typeof value==='string'?documentObject.querySelector(value):value;
  const visible=node=>!!node&&node.isConnected&&!node.hidden&&node.getAttribute('aria-hidden')!=='true'&&node.getClientRects().length>0;
  function focusables(modal){return [...modal.querySelectorAll(focusSelector)].filter(node=>visible(node)&&!node.closest('[inert]'))}
  function top(){return stack[stack.length-1]||null}
  function recordFor(modal,options={}){let record=records.get(modal);if(!record){record={modal,options:{},invoker:null};records.set(modal,record)}record.options={...record.options,...options};return record}
  function restoreBackground(){for(const [node,value] of priorBackground){if(value.inert)node.setAttribute('inert','');else node.removeAttribute('inert');if(value.ariaHidden==null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',value.ariaHidden)}priorBackground.clear()}
  function containBackground(){
    restoreBackground();const active=top()?.modal;if(!active)return;
    for(const node of [...documentObject.body.children]){if(node===active||node.contains(active))continue;priorBackground.set(node,{inert:node.hasAttribute('inert'),ariaHidden:node.getAttribute('aria-hidden')});node.setAttribute('inert','');node.setAttribute('aria-hidden','true')}
  }
  function initialTarget(record){const requested=element(record.options.initialFocus);if(requested&&record.modal.contains(requested)&&visible(requested)&&!requested.disabled)return requested;return focusables(record.modal)[0]||record.modal.querySelector('[role="dialog"]')||record.modal}
  function open(target,options={}){
    const modal=element(target);if(!modal)return false;const existing=stack.find(entry=>entry.modal===modal);if(existing)return true;
    const record=recordFor(modal,options);record.invoker=options.invoker||documentObject.activeElement;const dialog=modal.querySelector('[role="dialog"]')||modal;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');if(!dialog.hasAttribute('tabindex'))dialog.setAttribute('tabindex','-1');
    modal.hidden=false;stack.push(record);documentObject.body.classList.add('feedback-modal-open');containBackground();queueMicrotask(()=>{if(top()===record)initialTarget(record)?.focus?.({preventScroll:true})});root.dispatchEvent(new CustomEvent('rosterbot:dialog-opened',{detail:{id:modal.id||''}}));return true;
  }
  function fallbackFocus(){return documentObject.querySelector('[data-dialog-focus-fallback],#dashboardBrandHome,#v29NavHome,main button:not([disabled])')}
  function close(target,{restoreFocus=true}={}){
    const modal=element(target);if(!modal)return false;const index=stack.findIndex(entry=>entry.modal===modal);const record=index>=0?stack[index]:records.get(modal);if(index>=0)stack.splice(index,1);modal.hidden=true;containBackground();if(!stack.length)documentObject.body.classList.remove('feedback-modal-open');
    if(restoreFocus){const invoker=record?.invoker,focusTarget=invoker?.isConnected&&!invoker.closest?.('[inert]')?invoker:fallbackFocus();queueMicrotask(()=>focusTarget?.focus?.({preventScroll:true}))}
    root.dispatchEvent(new CustomEvent('rosterbot:dialog-closed',{detail:{id:modal.id||''}}));return true;
  }
  function requestClose(record,reason){if(record.options.closeOnEscape===false&&reason==='escape')return;if(record.options.closeOnBackdrop===false&&reason==='backdrop')return;const handler=record.options.onRequestClose;if(typeof handler==='function'){handler(reason);return}close(record.modal)}
  documentObject.addEventListener('keydown',event=>{
    const record=top();if(!record)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();requestClose(record,'escape');return}
    if(event.key!=='Tab')return;const items=focusables(record.modal);if(!items.length){event.preventDefault();initialTarget(record)?.focus?.();return}const first=items[0],last=items[items.length-1],active=documentObject.activeElement;if(event.shiftKey&&(active===first||!record.modal.contains(active))){event.preventDefault();last.focus()}else if(!event.shiftKey&&(active===last||!record.modal.contains(active))){event.preventDefault();first.focus()}
  },true);
  documentObject.addEventListener('focusin',event=>{const record=top();if(record&&!record.modal.contains(event.target)){event.stopImmediatePropagation();initialTarget(record)?.focus?.()}},true);
  documentObject.addEventListener('pointerdown',event=>{const record=top();if(record&&event.target===record.modal){event.preventDefault();event.stopImmediatePropagation();requestClose(record,'backdrop')}},true);
  root.RosterBotDialogs=Object.freeze({open,close,register:(target,options={})=>{const modal=element(target);return modal?recordFor(modal,options):null},isOpen:target=>stack.some(record=>record.modal===element(target)),top:()=>top()?.modal||null,focusables:target=>focusables(element(target))});
})(window);
