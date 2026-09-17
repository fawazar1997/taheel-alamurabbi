"use client";
import {useEffect} from "react";

export default function ProjectTools(){
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options?:{signal?:AbortSignal})=>unknown}}).modelContext;
    if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    Promise.resolve(context.registerTool({
      name:"read_project_summary",
      title:"قراءة ملخص مشروع تأهيل المربي",
      description:"يعرض إجمالي الجهات والمشاركين والخطط المكتملة من نفس بيانات لوحة المشرف.",
      inputSchema:{type:"object",properties:{},additionalProperties:false},
      annotations:{readOnlyHint:true,untrustedContentHint:false},
      async execute(){
        const response=await fetch("/api/project");
        if(!response.ok)throw new Error("تعذر قراءة مؤشرات المشروع");
        const data=await response.json();
        return {year:data.settings.year,organizations:data.organizations.length,participants:data.organizations.reduce((sum:number,org:{participants:number})=>sum+org.participants,0),completedPlans:data.organizations.filter((org:{planStatus:string})=>org.planStatus==="submitted").length};
      }
    },{signal:lifecycle.signal})).catch(()=>{});
    return()=>lifecycle.abort();
  },[]);
  return null;
}
