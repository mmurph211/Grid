// MooTools: the javascript framework.
// Load this file's selection again by visiting: http://mootools.net/more/ef3bb43ab3611f6139b38ed0c8985b93 
// Or build this file again with packager using: packager build More/Class.Binds More/Element.Delegation
/*
---
copyrights:
  - [MooTools](http://mootools.net)

licenses:
  - [MIT License](http://mootools.net/license.txt)
...
*/
MooTools.More={version:"1.3.0.1",build:"6dce99bed2792dffcbbbb4ddc15a1fb9a41994b5"};Class.Mutators.Binds=function(a){return a;};Class.Mutators.initialize=function(a){return function(){Array.from(this.Binds).each(function(b){var c=this[b];
if(c){this[b]=c.bind(this);}},this);return a.apply(this,arguments);};};Events.Pseudos=function(f,c,d){var b="monitorEvents:";var a=function(g){return{store:g.store?function(h,i){g.store(b+h,i);
}:function(h,i){(g.$monitorEvents||(g.$monitorEvents={}))[h]=i;},retrieve:g.retrieve?function(h,i){return g.retrieve(b+h,i);}:function(h,i){if(!g.$monitorEvents){return i;
}return g.$monitorEvents[h]||i;}};};var e=function(h){if(h.indexOf(":")==-1){return null;}var g=Slick.parse(h).expressions[0][0],i=g.pseudos;return(f&&f[i[0].key])?{event:g.tag,value:i[0].value,pseudo:i[0].key,original:h}:null;
};return{addEvent:function(l,n,i){var m=e(l);if(!m){return c.call(this,l,n,i);}var j=a(this),q=j.retrieve(l,[]),g=Array.from(f[m.pseudo]),k=g[1];var p=this;
var o=function(){g[0].call(p,m,n,arguments,k);};q.include({event:n,monitor:o});j.store(l,q);var h=m.event;if(k&&k[h]){h=k[h].base;}c.call(this,l,n,i);return c.call(this,h,o,i);
},removeEvent:function(m,l){var k=e(m);if(!k){return d.call(this,m,l);}var n=a(this),j=n.retrieve(m),i=Array.from(f[k.pseudo]),h=i[1];if(!j){return this;
}var g=k.event;if(h&&h[g]){g=h[g].base;}d.call(this,m,l);j.each(function(o,p){if(!l||o.event==l){d.call(this,g,o.monitor);}delete j[p];},this);n.store(m,j);
return this;}};};(function(){var b={once:function(d,e,c){e.apply(this,c);this.removeEvent(d.original,e);}};Events.definePseudo=function(c,d){b[c]=d;};var a=Events.prototype;
Events.implement(Events.Pseudos(b,a.addEvent,a.removeEvent));})();(function(){var b={once:function(d,e,c){e.apply(this,c);this.removeEvent(d.original,e);
}};Event.definePseudo=function(d,e,c){b[d]=[e,c];};var a=Element.prototype;[Element,Window,Document].invoke("implement",Events.Pseudos(b,a.addEvent,a.removeEvent));
})();Event.definePseudo("relay",function(d,e,b,c){var f=b[0];var a=c?c.condition:null;for(var h=f.target;h&&h!=this;h=h.parentNode){var g=document.id(h);
if(Slick.match(h,d.value)&&(!a||a.call(g,f))){if(g){e.call(g,f,g);}return;}}},{mouseenter:{base:"mouseover",condition:Element.Events.mouseenter.condition},mouseleave:{base:"mouseout",condition:Element.Events.mouseleave.condition}});
