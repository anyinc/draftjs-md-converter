(this.webpackJsonpdemo=this.webpackJsonpdemo||[]).push([[0],{189:function(e,t){function n(e){var t=new Error("Cannot find module '"+e+"'");throw t.code="MODULE_NOT_FOUND",t}n.keys=function(){return[]},n.resolve=n,e.exports=n,n.id=189},191:function(e,t,n){"use strict";n.r(t);var a=n(0),r=n.n(a),o=n(43),c=n.n(o),l=(n(89),n(44)),i=n(17),d=n(33),s=(n(190),"Here is some *bold* test and here's some _italics_!");var u={background:{minHeight:"100vh",color:"#fdf6e3",paddingTop:40},heading:{textAlign:"center"},root:{fontFamily:"'Helvetica', sans-serif",display:"flex",justifyContent:"space-evenly"},editor:{border:"1px solid #fdf6e3",cursor:"text",minHeight:80,color:"#fdf6e3",padding:20,height:"fit-content"},button:{marginTop:10,textAlign:"center"},output:{padding:20,width:"33%",overflow:"auto"},third:{padding:20,width:"33%",overflow:"auto"},textarea:{resize:"none",padding:20,backgroundColor:"transparent",border:"1px solid rgb(204, 204, 204)",color:"#fdf6e3",width:"calc(100% - 40px)",minHeight:80},blocks:{width:"calc(100% - 40px)"},draftHeading:{color:"#d33682"},markdownHeading:{color:"#2aa198"},blocksHeading:{color:"#b58900"}},f=function(){var e=Object(a.useState)((function(){return i.EditorState.createWithContent(Object(i.convertFromRaw)(Object(d.mdToDraftjs)(s)))})),t=Object(l.a)(e,2),n=t[0],o=t[1],c=Object(a.useState)(s),f=Object(l.a)(c,2),m=f[0],b=f[1],g=Object(a.useRef)(null),h=Object(a.useCallback)((function(){g.current.focus()}),[g]),v=Object(a.useCallback)((function(e){var t=e.target.value;b(t);var n=Object(d.mdToDraftjs)(t),a=Object(i.convertFromRaw)(n),r=i.EditorState.createWithContent(a);o(r)}),[]),p=Object(a.useCallback)((function(e){o(e);var t=Object(d.draftjsToMd)(Object(i.convertToRaw)(e.getCurrentContent()));b(t)}),[]);return r.a.createElement("div",{style:u.background},r.a.createElement("h1",{style:u.heading},"Draft.js Markdown Converter Demo"),r.a.createElement("div",{style:u.root},r.a.createElement("div",{style:u.third},r.a.createElement("h2",{style:u.draftHeading},"Draft.js"),r.a.createElement("div",{style:u.editor,onClick:h},r.a.createElement(i.Editor,{ref:g,editorState:n,onChange:p,placeholder:"Enter some text..."}))),r.a.createElement("div",{style:u.third},r.a.createElement("div",null,r.a.createElement("h2",{style:u.markdownHeading},"Markdown"),r.a.createElement("textarea",{style:u.textarea,value:m,onChange:v}))),r.a.createElement("div",{style:u.third},r.a.createElement("div",{style:u.blocks},r.a.createElement("h2",{style:u.blocksHeading},"Draft.js blocks"),r.a.createElement("pre",null,JSON.stringify(n.getCurrentContent(),null,2))))))};c.a.render(r.a.createElement(r.a.StrictMode,null,r.a.createElement(f,null)),document.getElementById("root"))},84:function(e,t,n){e.exports=n(191)},89:function(e,t,n){}},[[84,1,2]]]);
//# sourceMappingURL=main.5e0284b4.chunk.js.map