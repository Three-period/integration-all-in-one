/* V56 Review Process V5 — scoped mock workflows for development and AI review.
 * All data is in-memory per project; no real GitLab/Agent integration.
 * Does not touch demand/design/testing/release/closing render functions. */
(function(){
'use strict';
var CHECKS=['高风险必查','AI 未有效覆盖','独立抽检'];
var CLOSED=['已关闭','已闭环','授权例外','已裁定无问题'];
var ACTOR='检视工程师';
var nextSeq=1;
function h(v){return esc(String(v==null?'':v));}
function stamp(){return v35Stamp();}
function data(){return v35Data();}
function currentRun(d){return (d.runs||[]).slice().reverse().find(function(r){return r.commit===d.commit})||null;}
function openItems(d){return (d.issues||[]).filter(function(i){return CLOSED.indexOf(i.status)<0;});}
function humanItems(d){return openItems(d).filter(function(i){return ['异议待裁定','待人工处置','待线下评审'].indexOf(i.status)>=0;});}
function selfItems(d){return openItems(d).filter(function(i){return ['异议待裁定','待人工处置','待线下评审'].indexOf(i.status)<0;});}
function newId(prefix,list){var n=1;var ids=(list||[]).map(function(x){return x.id||x.taskId||x.groupId||'';});while(ids.indexOf(prefix+'-'+String(n).padStart(3,'0'))>=0)n++;return prefix+'-'+String(n).padStart(3,'0');}
function unique(list){return [...new Set(list)];}
function model(d){
 if(!d.reviewV5){
   d.reviewV5={process:null,tasks:[],meetings:[],feedback:[],verdicts:[],selected:[],selectedTaskId:'',
     view:'todos',filter:'全部',query:'',batchDraft:{},manualDraft:{},candidateDraft:null,meetingDraft:{},counter:0};
 }
 var m=d.reviewV5;
 if(m.process)m.process.currentCommit=d.commit;
 // Existing V55.6 demo/older state: import only a real formalRequest belonging to an existing Commit.
 if(!m.process&&d.formalRequest&&d.commit&&(d.commits||[]).some(function(c){return c.commit===d.formalRequest.commit;})){
   var id='PROC-001',task={taskId:'REV-001',processId:id,round:1,type:'首次正式检视',commit:d.formalRequest.commit,
     aiRunId:(currentRun(d)||{}).id||'',issueIds:humanItems(d).map(function(i){return i.id;}),
     status:d.approval?'已完成':'待处理',createdAt:d.formalRequest.at||stamp(),owner:d.formalRequest.owner||d.developer};
   m.process={id:id,currentCommit:d.commit,firstReviewCommit:d.formalRequest.commit,firstFormalTaskId:task.taskId,
     manualChecks:{},approval:d.approval||null};
   m.tasks.push(task);m.selectedTaskId=task.taskId;m.counter=1;
   (d.manual||[]).forEach(function(row){
     if(CHECKS.indexOf(row.kind)>=0&&['无新增问题','发现问题'].indexOf(row.result)>=0)
       m.process.manualChecks[row.kind]={completed:true,result:row.result,at:row.at||stamp(),commit:row.commit,
         findings:[],text:row.text||'',richHtml:row.richHtml||''};
   });
   task.issueIds.forEach(function(issueId){var i=d.issues.find(function(x){return x.id===issueId;});if(i&&!i.humanTaskId)i.humanTaskId=task.taskId;});
 }
 return m;
}
function approvalState(d,m){
 var process=m.process,run=currentRun(d),blockers=openItems(d),
     missing=CHECKS.filter(function(k){return !(process&&process.manualChecks[k]&&process.manualChecks[k].completed);});
 var aiValid=!!(run&&run.result==='完成'&&Array.isArray(run.checks)&&
   run.checks.length>0&&run.checks.every(function(c){return c.result==='通过';}));
 // A failed AI run can only be cleared through explicit, recorded per-issue human
 // "no issue" verdicts. It must never silently pass on missing checks or a new Commit.
 var failedRunIssues=run?(d.issues||[]).filter(function(i){
   return (i.run===run.id&&i.source==='AI 执行异常')||i.aiFailedRunId===run.id;
 }):[];
 var manualResolution=!!(process&&run&&run.result==='执行失败'&&failedRunIssues.length>0&&
   failedRunIssues.every(function(i){return CLOSED.includes(i.status)&&
     (m.verdicts||[]).some(function(v){return v.issueId===i.id&&v.result==='无问题';});
   }));
 var hasTask=!!(process&&process.firstFormalTaskId);
 var gate1=blockers.length===0&&(aiValid||manualResolution),gate2=missing.length===0;
 return {process:process,gate1:gate1,gate2:gate2,passed:gate1&&gate2&&hasTask&&state.role==='reviewer'&&!process.approval,
    missing:missing,blockers:blockers,aiValid:aiValid||manualResolution,
    aiManuallyResolved:manualResolution,hasTask:hasTask};
}
function canSubmit(d,m){
 var run=currentRun(d),ready=v35Ready(),own=selfItems(d),human=humanItems(d),p=m.process;
 if(!ready.commit||!ready.smoke||!ready.self)return {ok:false,reason:'请先完成冒烟、自测并提交当前 Commit'};
 if(!run)return {ok:false,reason:'当前 Commit 尚未生成 AI 检视批次'};
 if(own.length)return {ok:false,reason:'仍有 '+own.length+' 条开发/AI可自主处理问题：'+own.map(function(x){return x.id;}).join('、')};
 if(run.result!=='完成'&&!human.some(function(x){return x.status==='待人工处置';}))
   return {ok:false,reason:'AI 执行异常，请先重试或登记人工处置异常'};
 if(!p)return {ok:true,type:'首次正式检视',issues:human};
 var unsettled=human.filter(function(i){return !i.humanTaskId;});
 if(!unsettled.length)return {ok:false,reason:'没有新增待人工介入问题，保留原检视过程，直接查看准出门禁'};
 return {ok:true,type:unsettled.some(function(i){return i.source==='AI 执行异常';})?'AI异常定向处置':'追加异议裁定',issues:unsettled};
}
function createReview(d){
 var m=model(d),can=canSubmit(d,m);if(!can.ok){showToast(can.reason,'warn');return false;}
 if(state.role!=='developer'){showToast('仅开发工程师可以提交人工检视申请','warn');return false;}
 var r=currentRun(d),p=m.process;
 if(!p){
   p={id:newId('PROC',[{id:''}]),currentCommit:d.commit,firstReviewCommit:d.commit,firstFormalTaskId:'',manualChecks:{},approval:null};
   m.process=p;
 }
 var taskId=newId('REV',m.tasks),task={taskId:taskId,processId:p.id,round:m.tasks.length+1,type:can.type,
   commit:d.commit,aiRunId:r&&r.id||'',issueIds:can.issues.map(function(i){return i.id;}),
   status:'待处理',createdAt:stamp(),owner:d.developer};
 if(!p.firstFormalTaskId)p.firstFormalTaskId=taskId;
 m.tasks.push(task);m.selectedTaskId=taskId;m.view='todos';m.selected=[];
 can.issues.forEach(function(i){i.humanTaskId=taskId;i.reviewTaskId=taskId;i.processId=p.id;
   if(!i.originCommit)i.originCommit=i.commit;i.latestCommit=d.commit;
 });
 d.formalRequest={commit:d.commit,at:task.createdAt,owner:d.developer,processId:p.id,reviewTaskId:taskId};
 v35Log('提交 '+task.taskId+' · '+task.type+'（过程 '+p.id+'）');
 return true;
}
function counts(d,m){return CHECKS.filter(function(k){return !!(m.process&&m.process.manualChecks[k]&&m.process.manualChecks[k].completed);}).length;}
function chosenTask(m){return m.tasks.find(function(t){return t.taskId===m.selectedTaskId;})||m.tasks[m.tasks.length-1]||null;}
function markTask(d,m){
 var t=chosenTask(m);if(!t||t.status==='已完成')return;
 var gate=approvalState(d,m);
 var pending=t.issueIds.some(function(id){
   var i=d.issues.find(function(x){return x.id===id;});
   return i&&!CLOSED.includes(i.status);
 });
 if(gate.gate1&&gate.gate2)t.status='待准出确认';
 else if(pending||gate.blockers.some(function(i){return i.status==='待整改'||i.status==='待复检';})){
   if(t.status!=='已返回整改')t.status='处理中';
 }else if(t.status!=='已返回整改')t.status='待处理';
}
function issueEligible(d,m,i){var t=chosenTask(m);return !!(t&&t.issueIds.indexOf(i.id)>=0&&['异议待裁定','待人工处置'].includes(i.status)&&!i.meetingGroupId);}
function selectedIssues(d,m){return (d.issues||[]).filter(function(i){return m.selected.includes(i.id)&&issueEligible(d,m,i);});}
function evidencePanel(d){
 var run=currentRun(d);
 return v35Panel('检视资料',
  '<div class="v5-evidence"><b>GitLab 仓库 / Commit</b><p><button class="v43-evidence-link" data-v43="commit">'+h(d.commit||'暂无')+' ↗</button></p>'+
  '<small>'+h(d.repo||'Mock GitLab')+' / '+h(d.branch||'—')+'</small></div>'+
  '<div class="v5-evidence"><b>需求与设计依据</b><p>软件规格书、架构、概要、详细设计</p><button class="v43-evidence-link" data-v43="design">查看设计依据 ›</button></div>'+
  '<div class="v5-evidence"><b>AI 检视资料</b><p>文件一致性、文件正确性、方案与代码一致性、点检项检查</p>'+
  '<button class="btn" data-v5="ai-details">查看四项检视详细资料</button></div>'+
  '<div class="v5-evidence"><b>AI 执行记录</b><p>批次：'+h(run&&run.id||'未执行')+
  '</p><small>受检 Commit：'+h(run&&run.commit||d.commit||'—')+'；结果：'+h(run&&run.result||'未执行')+'</small></div>');
}
function todoPage(d,m){
 var terms=m.query.trim().toLowerCase(),tasks=m.tasks.filter(function(t){
   return (m.filter==='全部'||t.status===m.filter)&&(!terms||(t.taskId+' '+t.type+' '+t.processId+' '+d.task).toLowerCase().includes(terms));
 }).slice().sort(function(a,b){return b.round-a.round;});
 var control='<div class="v5-toolbar"><label>状态 <select data-v5-filter>'+
   ['全部','待处理','处理中','已返回整改','待准出确认','已完成'].map(function(x){return '<option '+(m.filter===x?'selected':'')+'>'+x+'</option>';}).join('')+
   '</select></label><label>搜索任务 <input data-v5-query placeholder="任务编号 / 类型" value="'+h(m.query)+'"></label></div>';
 var rows=tasks.map(function(t){
   return '<tr><td><b>'+h(t.taskId)+'</b><small>'+h(t.type)+'</small></td><td>'+h(t.processId)+
   '</td><td>第 '+t.round+' 轮</td><td>'+h(t.commit)+'<small>'+h(t.aiRunId||'无 AI 批次')+
   '</small></td><td>'+t.issueIds.length+'</td><td>'+h(t.status)+'</td><td>'+h(t.owner)+
   '<small>'+h(t.createdAt)+'</small></td><td><button class="btn" data-v5="choose-task" data-task="'+h(t.taskId)+'">'+
   (t.status==='已完成'?'查看记录':'进入专业检视')+'</button></td></tr>';
 }).join('');
 return v35Panel('检视待办 · 人工介入轮次',control+
  '<div class="table-wrap"><table class="v5-table"><thead><tr><th>待办</th><th>过程</th><th>轮次</th><th>Commit / AI</th><th>裁定数</th><th>状态</th><th>发起人 / 时间</th><th>操作</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="8" class="v5-empty">暂无符合条件的人工检视待办。开发工程师提交正式人工检视后才会生成任务。</td></tr>')+
  '</tbody></table></div>'+
  '<div class="v35-notice">仅正式人工介入申请生成任务；开发异议暂存、单纯新 Commit 和 AI 复检不会自动创建待办。</div>');
}
function issueCard(d,m,t){
 var pending=(d.issues||[]).filter(function(i){return t.issueIds.includes(i.id);});
 var eligible=pending.filter(function(i){return issueEligible(d,m,i);});
 var canEdit=t.status!=='已完成'&&state.role==='reviewer';
 var rows=pending.map(function(i){
   var editable=canEdit&&issueEligible(d,m,i);
   return '<tr><td><input type="checkbox" data-v5-issue="'+h(i.id)+'" '+(m.selected.includes(i.id)?'checked':'')+
    (editable?'':' disabled')+'></td><td><b>'+h(i.id)+'</b><small>'+h(i.title)+'</small></td>'+
    '<td>'+h(i.evidence||'—')+'</td><td>'+h(i.dispute||'—')+'</td><td>'+h(i.commit||'—')+
    '</td><td>'+h(i.status)+'</td><td><button class="btn" data-v5="issue-detail" data-id="'+h(i.id)+'">查看</button></td></tr>';
 }).join('');
 var meeting=m.meetings.filter(function(g){return g.issueIds.some(function(id){return t.issueIds.includes(id);});});
 return v35Panel('① 开发待裁定问题',
 '<div class="v5-toolbar"><span>待裁定 '+eligible.length+' 条 · 选中 '+m.selected.filter(function(id){return eligible.some(function(i){return i.id===id;});}).length+' 条</span>'+
 '<button class="btn" data-v5="batch-feedback" '+(!canEdit?'disabled':'')+'>反馈整改意见</button>'+
 '<button class="btn" data-v5="batch-noissue" '+(!canEdit?'disabled':'')+'>批量确认无问题</button>'+
 '<button class="btn" data-v5="batch-meeting" '+(!canEdit?'disabled':'')+'>发起线下裁定评审</button></div>'+
 '<div class="table-wrap"><table class="v5-table"><thead><tr><th>选择</th><th>问题</th><th>AI证据</th><th>开发异议</th><th>Commit</th><th>状态</th><th>查看</th></tr></thead><tbody>'+
 (rows||'<tr><td colspan="7" class="v5-empty">本轮没有待裁定问题，可并行开展人工专业检视。</td></tr>')+
 '</tbody></table></div>'+
 (meeting.length?'<div class="v5-note"><b>关联会议：</b>'+meeting.map(function(g){return '<button class="btn" data-v5="meeting-open" data-group="'+h(g.groupId)+'">'+h(g.groupId)+'（'+h(g.status)+'）</button>';}).join('')+'</div>':'')+
 '<div class="v35-notice">已进入线下评审的 issueId 会被独占锁定，不能再参加普通反馈或其他会议。</div>');
}
function manualCard(d,m,t){
 var n=counts(d,m);
 return v35Panel('② 人工专业检视',
   '<div class="v5-row"><strong>'+n+' / 3 已完成</strong><span>'+h(CHECKS.filter(function(k){return !(m.process&&m.process.manualChecks[k]&&m.process.manualChecks[k].completed);}).join('、')||'三项已全部完成')+'</span>'+
   '<button class="btn primary" data-v5="manual-open" '+(state.role!=='reviewer'||t.status==='已完成'?'disabled':'')+'>开展人工专业检视</button></div>'+
   '<div class="v35-notice">三项独立保存，允许发现问题。发现的问题进入结构化整改清单；完成 3/3 不代表阻断问题已经闭环。追加轮次复用已完成记录。</div>');
}
function feedbackCard(d,m,t){
 return v35Panel('③ 规则反馈',
 '<div class="v5-row"><span>候选记录 '+m.feedback.length+' 条（不参与准出门禁）</span><button class="btn" data-v5="feedback-open" '+(state.role==='reviewer'&&t.status!=='已完成'?'':'disabled')+'>新增规则反馈</button></div>'+
 (m.feedback.length?'<div class="v35-list">'+m.feedback.slice().reverse().map(function(x){
   return '<div class="v35-list-item"><b>'+h(x.id)+' · '+h(x.type)+'</b> · '+h(x.status)+
    '<small>'+h(x.at)+'</small><p>'+h(x.text)+'</p></div>';
 }).join('')+'</div>':'<div class="v5-empty">暂无候选规则反馈。</div>')+
 '<div class="v35-notice">候选反馈不会直接修改生效规则；若属于必须整改的代码问题，请在人工检视中新增结构化整改项。</div>');
}
function exitPanel(d,m,t){
 var x=approvalState(d,m),done=x.gate1&&x.gate2&&x.hasTask,already=!!(m.process&&m.process.approval);
 var problems=x.blockers.map(function(i){return i.id+'('+i.status+')';}).join('、');
 return v35Panel('准出确认 · 专业检视页面内嵌',
 '<div class="v5-gates"><div class="v5-gate"><b>G1：必须处理的问题全部闭环</b>'+
 '<div>'+h(x.gate1?'已通过':problems||(!x.aiValid?'当前 Commit 的 AI 检视未有效完成':'尚有问题'))+'</div></div>'+
 '<div class="v5-gate"><b>G2：人工三项专业检视完成</b><div>'+counts(d,m)+'/3 · '+h(x.missing.join('、')||'全部完成')+'</div></div></div>'+
 '<div class="v5-row"><button class="btn primary" data-v5="approve" '+(!done||already||state.role!=='reviewer'?'disabled':'')+
 '>确认检视通过并进入测试节点</button>'+
 (already?'<span class="tag green">已准出 · '+h(m.process.approval.commit)+'</span>':'<span class="mini-note">仅检视工程师可最终批准，不要求开发再次提交提测 Commit。</span>')+'</div>');
}
function professionalPage(d,m){
 var t=chosenTask(m),p=m.process;
 if(!p||!t)return '<div class="v35-notice warn">尚无正式人工检视任务。请由开发工程师完成自主整改后发起人工检视申请。</div>';
 if(t.status!=='已完成')markTask(d,m);
 var run=currentRun(d);
 var banner='<div class="v5-summary"><b>正式检视过程：'+h(p.id)+'</b><div>项目：'+h(project().name)+' · 开发任务：'+h(d.task)+
   ' · 待办：'+h(t.taskId)+' · 第 '+t.round+' 轮 · '+h(t.status)+'</div>'+
   '<div>当前 Commit：'+h(d.commit)+' · 首次人工检视基线：'+h(p.firstReviewCommit)+
   ' · AI 批次：'+h(run&&run.id||'未执行')+' · 待裁定：'+humanItems(d).length+
   ' · 待闭环：'+openItems(d).length+' · 人工检查：'+counts(d,m)+'/3</div></div>';
 var left=issueCard(d,m,t)+manualCard(d,m,t)+feedbackCard(d,m,t);
 return banner+'<div class="v5-columns"><section class="v5-left">'+left+'</section><aside class="v5-right">'+evidencePanel(d)+'</aside></div>'+
    exitPanel(d,m,t);
}
function reviewerPage(d){
 var m=model(d);
 if(!m.view)m.view='todos';
 return '<div class="v5-root"><div class="v5-tabs">'+
  '<button class="'+(m.view==='todos'?'active':'')+'" data-v5="view-todos">检视待办</button>'+
  '<button class="'+(m.view==='professional'?'active':'')+'" data-v5="view-professional">专业检视</button></div>'+
  (m.view==='todos'?todoPage(d,m):professionalPage(d,m))+'</div>';
}
v35Reviewer=function(d){return reviewerPage(d);};
function openBatchFeedback(d,m){
 var issues=selectedIssues(d,m);if(!issues.length){showToast('请选择本轮未锁定且待裁定的问题','warn');return;}
 var body='<div class="v5-root"><div class="v35-notice">共选 '+issues.length+' 条问题；每个问题独立保存反馈意见，缺任何一项不能批量提交。</div>'+
 issues.map(function(i,index){
   return '<section class="v5-issue-block"><h3>'+(index+1)+'. '+h(i.id)+' · '+h(i.title)+'</h3>'+
   '<p>AI 原问题：'+h(i.title)+'<br>证据 / 位置：'+h(i.evidence||'无')+
   '<br>开发异议：'+h(i.dispute||'无')+'<br>关联 Commit：'+h(i.commit)+'</p>'+
   '<label>针对 '+h(i.id)+' 的整改裁定反馈（必填）</label>'+
   '<div class="v5-editor-tools">'+editorButtons('v5-batch-editor-'+i.id)+'</div>'+
   '<div class="v5-editor" contenteditable="true" data-v5-batch-editor="'+h(i.id)+'" id="v5-batch-editor-'+h(i.id)+'">'+
   (m.batchDraft[i.id]||'')+'</div></section>';
 }).join('')+'</div>';
 openDrawer('批量反馈整改意见 · '+issues.length+' 项',body,
   '<button class="btn" data-v5="drawer-cancel">取消</button><button class="btn primary" data-v5="batch-feedback-save">批量保存并返回整改</button>');
}
function editorButtons(id){
 return [['bold','加粗'],['italic','斜体'],['insertUnorderedList','列表'],['formatBlock','小标题']].map(function(x){
   return '<button type="button" class="btn" data-v5="editor-format" data-target="'+h(id)+'" data-format="'+x[0]+'">'+x[1]+'</button>';
 }).join('');
}
function openBatchNoIssue(d,m){
 var items=selectedIssues(d,m);if(!items.length){showToast('请先选择待裁定问题','warn');return;}
 openDrawer('批量确认无问题 · 二次确认',
 '<div class="v5-root"><p>将以下 '+items.length+' 条问题分别裁定为无问题并关闭，其他问题保持原状态：</p>'+
 items.map(function(i){return '<p><b>'+h(i.id)+'</b> · '+h(i.title)+'</p>';}).join('')+
 '<label>裁定依据（可选）<textarea id="v5NoIssueReason" class="input" rows="3"></textarea></label></div>',
 '<button class="btn" data-v5="drawer-cancel">取消</button><button class="btn primary" data-v5="batch-noissue-save">确认关闭所选问题</button>');
}
function meetingHtml(group){
 var d=data(),m=model(d),items=group.issueIds.map(function(id){return d.issues.find(function(i){return i.id===id;});}).filter(Boolean);
 var locked=group.status==='待线下评审';
 return '<div class="v5-root"><div class="v35-notice">会议组 '+h(group.groupId)+' · '+h(group.status)+' · 问题 ID 已独占绑定。</div>'+
 '<label>会议名称 <input id="v5MeetingName" class="input" value="'+h(group.name||'')+'" '+(!locked?'readonly':'')+'></label>'+
 '<label>会议时间 <input id="v5MeetingTime" type="datetime-local" class="input" value="'+h(group.time||'')+'" '+(!locked?'readonly':'')+'></label>'+
 '<label>会议纪要（必填，富文本）</label><div class="v5-editor-tools">'+editorButtons('v5Minutes')+'</div>'+
 '<div class="v5-editor" id="v5Minutes" contenteditable="'+(locked?'true':'false')+'">'+(group.minutes||'')+'</div>'+
 items.map(function(i){var decision=group.decisions[i.id]||{};return '<section class="v5-issue-block"><b>'+h(i.id)+' · '+h(i.title)+'</b>'+
 '<p>'+h(i.evidence||'')+'</p><label>独立裁定结论</label><select data-v5-meeting-verdict="'+h(i.id)+'" '+(!locked?'disabled':'')+'>'+
 ['','整改','无问题'].map(function(v){return '<option value="'+v+'" '+(decision.result===v?'selected':'')+'>'+(v||'请选择结论')+'</option>';}).join('')+'</select>'+
 '<label>该问题的执行依据（必填）</label><textarea data-v5-meeting-reason="'+h(i.id)+'" rows="3" '+(!locked?'readonly':'')+'>'+h(decision.reason||'')+'</textarea></section>';}).join('')+
 '</div>';
}
function openMeeting(group){
 var body=meetingHtml(group),locked=group.status==='待线下评审';
 openDrawer('线下裁定评审 · '+group.groupId,body,locked?
 '<button class="btn" data-v5="meeting-cancel" data-group="'+h(group.groupId)+'">取消会议并解除锁定</button>'+
 '<button class="btn primary" data-v5="meeting-save" data-group="'+h(group.groupId)+'">保存纪要及逐项裁定</button>':
 '<button class="btn" data-v5="drawer-cancel">关闭</button>');
}
function openManual(d,m){
 var p=m.process,t=chosenTask(m);if(!p||!t)return;
 var parts=CHECKS.map(function(k){
   var record=p.manualChecks[k],done=record&&record.completed;
   var draft=m.manualDraft[k]||{result:'',rows:[]};
   if(done)return '<section class="v5-issue-block"><b>'+h(k)+' · 已完成</b><p>结论：'+h(record.result)+' · '+h(record.commit)+' · '+h(record.at)+
    '</p><small>发现问题：'+h((record.findings||[]).join('、')||'无')+'；历史记录不因新增 Commit 清除。</small></section>';
   return '<section class="v5-issue-block" data-v5-manual-kind="'+h(k)+'"><h3>'+h(k)+'</h3>'+
   '<label>检查结果 <select data-v5-check-result="'+h(k)+'"><option value="">请选择</option>'+
   '<option value="无新增问题" '+(draft.result==='无新增问题'?'selected':'')+'>已完成－无新增问题</option>'+
   '<option value="发现问题" '+(draft.result==='发现问题'?'selected':'')+'>已完成－发现问题</option></select></label>'+
   '<div data-v5-finding-list="'+h(k)+'">'+(draft.rows||[]).map(function(row,index){return findingRow(k,index,row);}).join('')+'</div>'+
   '<button type="button" class="btn" data-v5="add-finding" data-kind="'+h(k)+'">＋新增结构化问题</button></section>';
 }).join('');
 openDrawer('人工专业检视 · 三项独立记录',
  '<div class="v5-root"><div class="v35-notice">已完成 '+counts(d,m)+'/3；只提交本次填写的检查，未填写的项目不标记完成。发现问题需填写独立问题条目。</div>'+parts+'</div>',
  '<button class="btn" data-v5="drawer-cancel">取消</button><button class="btn primary" data-v5="manual-save">保存本次人工检视</button>');
}
function findingRow(kind,index,row){
 row=row||{};
 return '<div class="v5-finding" data-v5-finding="'+h(kind)+'" data-index="'+index+'">'+
 '<label>问题标题 <input data-v5-field="title" value="'+h(row.title||'')+'"></label>'+
 '<label>问题描述 / 证据（富文本）</label><div class="v5-editor-tools">'+editorButtons('v5-find-'+h(kind)+'-'+index)+'</div>'+
 '<div class="v5-editor" id="v5-find-'+h(kind)+'-'+index+'" data-v5-field="detail" contenteditable="true">'+(row.richHtml||'')+'</div>'+
 '<label>整改要求 <textarea data-v5-field="requirement">'+h(row.requirement||'')+'</textarea></label></div>';
}
function openCandidate(d,m){
 openDrawer('候选规则及经验反馈',
 '<div class="v5-root"><label>反馈类型 <select id="v5FeedbackType">'+
 ['误报','漏检','规则不完善','优化经验'].map(function(x){return '<option>'+x+'</option>';}).join('')+'</select></label>'+
 '<label>关联 AI / 人工问题 ID（可选） <input id="v5FeedbackIssue" placeholder="如 ISS-001"></label>'+
 '<label>规则 / 规范编号（可选） <input id="v5FeedbackRule" placeholder="如 R-017"></label>'+
 '<label>反馈描述 / 建议（富文本，必填）</label><div class="v5-editor-tools">'+editorButtons('v5FeedbackEditor')+'</div>'+
 '<div class="v5-editor" id="v5FeedbackEditor" contenteditable="true"></div>'+
 '<label>相关证据 / 版本 <textarea id="v5FeedbackEvidence">'+h(d.commit)+'</textarea></label>'+
 '</div>','<button class="btn" data-v5="drawer-cancel">取消</button><button class="btn primary" data-v5="feedback-save">保存候选反馈</button>');
}
function openIssue(id){
 var i=data().issues.find(function(x){return x.id===id;});if(!i)return;
 openDrawer('检视问题详情 · '+h(id),
 '<div class="v5-root"><h3>'+h(i.id)+' · '+h(i.title)+'</h3><p>状态：'+h(i.status)+'<br>原始 Commit：'+h(i.commit)+
 '</p><p>AI 证据：'+h(i.evidence||'无')+'</p><p>开发异议：'+h(i.dispute||'无')+'</p>'+
 '<p>人工裁定：'+h(i.verdict||'未裁定')+'</p><p>AI 复检：'+h(i.recheckedCommit||'未复检')+'</p></div>');
}
function addFinding(kind){
 var container=document.querySelector('[data-v5-finding-list="'+kind+'"]');if(!container)return;
 var index=container.querySelectorAll('[data-v5-finding]').length;
 container.insertAdjacentHTML('beforeend',findingRow(kind,index,{}));
}
function parseText(html){var t=document.createElement('div');t.innerHTML=html||'';return (t.innerText||t.textContent||'').trim();}
function getHtml(id){var node=document.getElementById(id);return node?node.innerHTML.trim():'';}
function captureBatch(m){
 document.querySelectorAll('[data-v5-batch-editor]').forEach(function(node){m.batchDraft[node.dataset.v5BatchEditor]=node.innerHTML;});
}
function saveBatch(){
 var d=data(),m=model(d),issues=selectedIssues(d,m);
 if(!issues.length){showToast('选中的问题已被其他动作处理，请重新选择','warn');return;}
 captureBatch(m);
 for(var n=0;n<issues.length;n++){var i=issues[n];if(!parseText(m.batchDraft[i.id])){
   showToast('请填写 '+i.id+' 的独立整改反馈','warn');
   var node=document.querySelector('[data-v5-batch-editor="'+i.id+'"]');if(node){node.focus();node.scrollIntoView({block:'center'});}
   return;
 }}
 issues.forEach(function(i){
   var rich=m.batchDraft[i.id];
   i.verdict='人工裁定必须整改';i.verdictRich=rich;i.reply=parseText(rich);
   i.status='待整改';i.humanVerdictAt=stamp();i.humanVerdictBy=ACTOR;
   m.verdicts.push({issueId:i.id,taskId:m.selectedTaskId,richHtml:rich,result:'整改',at:stamp()});
 });
 var t=chosenTask(m);if(t)t.status='已返回整改';
 m.selected=[];d.v47NeedsNewCommit=true;d.prep={owner:d.developer,smoke:null,self:null};
 v35Log('人工裁定 '+issues.length+' 项返回开发整改（逐 issueId 独立反馈）');
 closeDrawer();render();showToast('已分别保存 '+issues.length+' 条意见，返回开发整改');
}
function saveNoIssue(){
 var d=data(),m=model(d),items=selectedIssues(d,m),reason=(document.getElementById('v5NoIssueReason')||{}).value||'人工复核确认无问题';
 if(!items.length){showToast('问题已改变状态，请重新勾选','warn');return;}
 items.forEach(function(i){
   i.status='已关闭';i.verdict='裁定无问题';i.reply=reason;i.humanVerdictAt=stamp();
   m.verdicts.push({issueId:i.id,taskId:m.selectedTaskId,result:'无问题',reason:reason,at:stamp()});
 });
 m.selected=[];markTask(d,m);closeDrawer();render();showToast('所选 '+items.length+' 条问题已独立关闭');
}
function startMeeting(){
 var d=data(),m=model(d),items=selectedIssues(d,m);
 if(!items.length){showToast('请选择未锁定的待裁定问题','warn');return;}
 var id=newId('MEET',m.meetings);
 var group={groupId:id,taskId:m.selectedTaskId,issueIds:items.map(function(i){return i.id;}),
   status:'待线下评审',name:'',time:'',minutes:'',decisions:{},createdAt:stamp()};
 m.meetings.push(group);
 items.forEach(function(i){i.meetingGroupId=id;i.status='待线下评审';});
 m.selected=[];v35Log('线下会议 '+id+' 独占锁定 '+items.map(function(i){return i.id;}).join('、'));
 render();openMeeting(group);
}
function saveMeeting(group){
 var d=data(),m=model(d),name=(document.getElementById('v5MeetingName')||{}).value||'',
  time=(document.getElementById('v5MeetingTime')||{}).value||'',minutes=getHtml('v5Minutes');
 if(!parseText(minutes)){showToast('会议纪要不能为空','warn');return;}
 var decisions={};
 for(var id of group.issueIds){
  var sel=document.querySelector('[data-v5-meeting-verdict="'+id+'"]'),
    note=document.querySelector('[data-v5-meeting-reason="'+id+'"]');
  var result=sel&&sel.value,reason=note&&note.value.trim();
  if(!result||!reason){showToast(id+' 缺少独立裁定结论或依据','warn');if(sel)sel.focus();return;}
  decisions[id]={result:result,reason:reason};
 }
 group.name=name;group.time=time;group.minutes=minutes;group.decisions=decisions;group.status='已完成';group.completedAt=stamp();
 group.issueIds.forEach(function(id){
  var issue=d.issues.find(function(x){return x.id===id;});if(!issue)return;
  var decision=decisions[id];
  issue.status=decision.result==='整改'?'待整改':'已关闭';
  issue.verdict='会议 '+group.groupId+'：'+decision.result;
  issue.reply=decision.reason;issue.humanVerdictAt=stamp();
  m.verdicts.push({issueId:id,taskId:group.taskId,meetingGroupId:group.groupId,result:decision.result,reason:decision.reason,at:stamp()});
 });
 var t=chosenTask(m);if(t&&group.issueIds.some(function(id){return (d.issues.find(function(i){return i.id===id;})||{}).status==='待整改';})){t.status='已返回整改';d.v47NeedsNewCommit=true;d.prep={owner:d.developer,smoke:null,self:null};}
 m.selected=[];closeDrawer();render();showToast('会议纪要与逐问题裁定已保存');
}
function cancelMeeting(group){
 var reason=window.prompt('请输入取消会议的原因（必填）','');
 if(!reason||!reason.trim()){showToast('取消原因不能为空，会议仍保持锁定','warn');return;}
 var d=data(),m=model(d);
 group.status='已取消';group.cancelReason=reason.trim();group.cancelledAt=stamp();
 group.issueIds.forEach(function(id){
  var i=d.issues.find(function(x){return x.id===id;});
  if(i&&i.meetingGroupId===group.groupId&&i.status==='待线下评审'){
    i.meetingGroupId=null;i.status=i.dispute?'异议待裁定':'待人工处置';
  }
 });
 closeDrawer();render();showToast('会议已取消，问题锁定已解除，审计记录保留');
}
function manualSave(){
 var d=data(),m=model(d),p=m.process;if(!p)return;
 var changes=[],checks=CHECKS.filter(function(k){return !(p.manualChecks[k]&&p.manualChecks[k].completed);});
 for(var k of checks){
  var select=document.querySelector('[data-v5-check-result="'+k+'"]'),result=select&&select.value;
  if(!result)continue;
  var rows=[...document.querySelectorAll('[data-v5-finding="'+k+'"]')].map(function(el){
   var title=el.querySelector('[data-v5-field="title"]'),
     description=el.querySelector('[data-v5-field="detail"]'),
     requirement=el.querySelector('[data-v5-field="requirement"]');
   return {title:title&&title.value.trim()||'',richHtml:description&&description.innerHTML.trim()||'',
    requirement:requirement&&requirement.value.trim()||''};
  });
  if(result==='发现问题'){
   if(!rows.length){showToast(k+'：发现问题必须至少新增一条结构化问题','warn');return;}
   var missing=rows.findIndex(function(r){return !r.title||!parseText(r.richHtml)||!r.requirement;});
   if(missing>=0){showToast(k+' 第 '+(missing+1)+' 条缺少问题标题、证据或整改要求','warn');return;}
  }
  changes.push({kind:k,result:result,rows:result==='发现问题'?rows:[]});
 }
 if(!changes.length){showToast('请至少完成一项尚未保存的检查','warn');return;}
 changes.forEach(function(change){
  // Allocate IDs after every insert: multiple findings in one check must never share an ID.
  var ids=[];
  change.rows.forEach(function(row){
   var issueId=newId('HUM',d.issues);
   var issue={id:issueId,source:'人工检视',title:row.title,evidence:parseText(row.richHtml),
    richHtml:row.richHtml,requirement:row.requirement,kind:change.kind,
    commit:d.commit,originCommit:d.commit,latestCommit:d.commit,
    run:(currentRun(d)||{}).id||'',status:'待整改',reviewTaskId:m.selectedTaskId,
    processId:p.id,createdBy:ACTOR,createdAt:stamp(),reply:''};
   d.issues.push(issue);ids.push(issueId);
  });
  p.manualChecks[change.kind]={completed:true,result:change.result,findings:ids,
    commit:d.commit,at:stamp(),reviewTaskId:m.selectedTaskId};
  d.manual.push({kind:change.kind,commit:d.commit,result:change.result,text:'人工专业检视（V5）',at:stamp(),processId:p.id,reviewTaskId:m.selectedTaskId});
 });
 var task=chosenTask(m);
 if(task&&changes.some(function(c){return c.rows.length;})){
   task.status='已返回整改';d.v47NeedsNewCommit=true;d.prep={owner:d.developer,smoke:null,self:null};
 }else markTask(d,m);
 v35Log('人工专业检视保存 '+changes.map(function(c){return c.kind+' · '+c.result;}).join('；'));
 closeDrawer();render();showToast('人工专业检视已保存 '+changes.length+' 项；已完成 '+counts(d,m)+'/3');
}
function saveCandidate(){
 var d=data(),m=model(d),rich=getHtml('v5FeedbackEditor'),txt=parseText(rich);
 if(!txt){showToast('请填写规则反馈建议','warn');return;}
 var id=newId('FB',m.feedback);
 var ref=(document.getElementById('v5FeedbackIssue')||{}).value||'';
 var item={id:id,type:(document.getElementById('v5FeedbackType')||{}).value||'规则不完善',
  relatedIssueIds:ref.split(/[,，\s]+/).filter(Boolean),
  ruleId:(document.getElementById('v5FeedbackRule')||{}).value||'',
  richHtml:rich,text:txt,evidence:(document.getElementById('v5FeedbackEvidence')||{}).value||'',
  commit:d.commit,at:stamp(),owner:ACTOR,status:'候选'};
 m.feedback.push(item);
 v35Log('新增候选规则反馈 '+id);closeDrawer();render();showToast('已保存候选规则反馈；不影响检视准出');
}
function approve(d,m){
 var g=approvalState(d,m);
 if(!g.passed){showToast('准出受阻：请核对未闭环问题及人工三项记录','warn');return;}
 if(m.process.approval||d.handoff)return;
 var at=stamp(),record={processId:m.process.id,commit:d.commit,at:at,reviewer:ACTOR,
   closedIssueIds:(d.issues||[]).filter(function(i){return CLOSED.includes(i.status);}).map(function(i){return i.id;})};
 m.process.approval=record;
 d.approval={commit:d.commit,at:at,reviewer:ACTOR,processId:record.processId};
 d.handoff=true;v35Log('检视过程 '+m.process.id+' 已准出，正式移交 '+d.commit+' 至测试');
 m.tasks.forEach(function(t){t.status='已完成';});
 v52SyncHandoff();
 if(v52CurrentCommit()!==d.commit){m.process.approval=null;d.approval=null;d.handoff=false;showToast('移交 Commit 校验失败','warn');return;}
 var p=project();p.status='进行中';p.flowStatus='测试阶段';p.progress=Math.max(Number(p.progress)||0,60);
 state.lifecycleStage='testing';state.projectSection='lifecycle';state.view='project-lifecycle';
 render();showToast('正式检视通过，已进入测试节点（Mock）');
}
function updateDevDrawer(){
 if(state.role!=='developer')return;
 var root=document.getElementById('drawerBody');if(!root)return;
 root.querySelectorAll('[data-v35="request-formal"]').forEach(function(btn){btn.remove();});
 root.querySelectorAll('[data-v35="handoff"]').forEach(function(btn){var section=btn.closest('.v35-panel');if(section)section.remove();});
 var d=data(),m=model(d),can=canSubmit(d,m);
 var block=document.createElement('section');block.className='v35-panel v5-dev-review-entry';
 block.innerHTML='<div class="v35-panel-head"><h3>开发提交人工检视 · V5</h3></div><div class="v35-panel-body">'+
 '<p class="v5-note">开发异议先暂存，不即时生成待办；每次确需人工介入时才生成 REV 轮次。纯 AI 复检不生成待办。</p>'+
 '<div class="v35-notice '+(can.ok?'':'warn')+'">'+h(can.ok?('已满足提交条件 · '+can.type+' · 待裁定 '+can.issues.length+' 条'):can.reason)+'</div>'+
 '<button class="btn primary" data-v5="dev-submit" '+(!can.ok?'disabled':'')+'>提交'+h(can.type||'正式人工检视')+'</button>'+
 (m.process?'<p class="v35-mini">过程 '+h(m.process.id)+' · 历史待办 '+m.tasks.length+' 条 · 人工检查 '+counts(d,m)+'/3</p>':'')+'</div>';
 root.appendChild(block);
}
var oldAI=v35AI;
v35AI=function(){oldAI();updateDevDrawer();};
var oldPerformAi=v35PerformAi;
var oldRecheck=v46IsRecheck;
v46IsRecheck=function(){
 var d=data();return oldRecheck()||openItems(d).some(function(i){
  return ['待整改','待复检'].includes(i.status)&&i.commit!==d.commit&&
     (i.source==='人工检视'||i.humanVerdictBy===ACTOR||i.meetingGroupId);
 });
};
v35PerformAi=function(mode){
 var d=data(),oldRun=(currentRun(d)||{}).id||'',oldCount=d.issues.length;
 var wasRecheck=v46IsRecheck();
 if(mode==='pass'&&wasRecheck){
   // Recheck accepted issues; never close merely because Commit changed.
   d.issues.forEach(function(i){if(i.status==='待整改'&&i.commit!==d.commit)i.status='待复检';});
 }
 oldPerformAi(mode);
 var r=currentRun(d);
 if(!r||r.id===oldRun)return;
 var m=model(d);
 if(m.process)m.process.currentCommit=d.commit;
 d.issues.slice(oldCount).forEach(function(i){
   if(!i.originCommit)i.originCommit=i.commit;
   i.latestCommit=d.commit;
   if(m.process)i.processId=m.process.id;
 });
 if(mode==='pass'&&r.result==='完成'){
   d.issues.forEach(function(i){
     if(i.status==='待人工处置'&&i.aiFailedRunId&&i.commit!==d.commit){
       i.status='已闭环';i.recheckedCommit=d.commit;i.recheckRunId=r.id;
       i.resolution='AI 再次有效复检通过（Mock）';
     }
     if(['待复检','待整改'].includes(i.status)&&i.commit!==d.commit&&
      (i.source==='人工检视'||i.humanVerdictBy===ACTOR||i.meetingGroupId)){
       i.status='已关闭';i.latestCommit=d.commit;i.recheckedCommit=d.commit;
       i.recheckedAt=stamp();i.resolution='AI 复检通过（Mock）';i.recheckRunId=r.id;
     }
     if(i.source==='AI 执行异常'&&i.status==='待人工处置'&&i.commit===d.commit){
       i.status='已关闭';i.resolution='重新执行 AI 检视成功（Mock）';i.recheckRunId=r.id;
     }
   });
 }else if(mode==='issues'){
   d.issues.forEach(function(i){if(i.status==='待复检'&&i.commit!==d.commit)i.status='待整改';});
   if(wasRecheck){
     // Distinct NEW finding in a recheck, rather than creating a second ID for a failed old finding.
     var title='复检发现新增接口映射与设计方案不一致';
     if(!d.issues.some(function(i){return i.title===title&&i.commit===d.commit;})){
       d.issues.push({id:newId('ISS',d.issues),source:'AI 检视',title:title,
         evidence:'当前复检批次 '+r.id+' · 独立新增问题（Mock）',commit:d.commit,run:r.id,
         status:'待整改',createdAt:stamp(),dispute:'',reply:''});
     }
   }
 }
 if(mode==='fail'){
   // Preserve existing issue IDs when AI cannot verify a recheck.
   var candidates=openItems(d).filter(function(i){return ['待整改','待复检'].includes(i.status)&&i.commit!==d.commit;});
   if(candidates.length){
     candidates.forEach(function(i){i.status='待人工处置';i.aiFailedRunId=r.id;
       i.reply=(i.reply||'')+'；'+r.id+' AI 复检无法判断，待人工处置';});
   }else if(!d.issues.some(function(i){return i.source==='AI 执行异常'&&i.commit===d.commit&&i.status==='待人工处置';})){
     var id=newId('ERR',d.issues);
     d.issues.push({id:id,source:'AI 执行异常',title:'AI 检视执行失败 / 无法判断',evidence:'批次 '+r.id+' · '+d.commit,
       commit:d.commit,run:r.id,status:'待人工处置',createdAt:stamp(),dispute:'AI 无法判断'});
   }
 }
 if(m.process){
   var last=m.tasks[m.tasks.length-1];
   if(last&&last.status!=='已完成')markTask(d,m);
 }
 v35AI();
};
function entries(){
 var out=[];
 Object.keys(v35Store).forEach(function(pid){
  var d=v35Store[pid],m=d&&d.reviewV5;if(!m)return;
  m.tasks.forEach(function(t){out.push({pid:pid,type:'formal',title:t.type+' · '+d.task,
   id:t.taskId,commit:t.commit,status:t.status,taskId:t.taskId,round:t.round});});
 });
 return out.sort(function(a,b){return b.round-a.round;});
}
v41TaskEntries=entries;
v41ReviewerEntriesWithDemo=entries; // Do not create synthetic tasks that have no formal submission.
v41OpenReviewerTask=function(pid,type,demo){
 if(!projects[pid])return;
 state.projectId=pid;state.role='reviewer';
 var d=data(),m=model(d);
 m.selectedTaskId= (m.tasks[m.tasks.length-1]||{}).taskId||'';
 m.view='professional';state.projectSection='lifecycle';state.lifecycleStage='development';
 setView('project-lifecycle');
};
v41TaskTable=function(){
 var list=entries();return '<div class="card table-wrap"><table class="v5-table"><thead><tr><th>检视待办</th><th>项目</th><th>Commit</th><th>状态</th><th>操作</th></tr></thead><tbody>'+
 (list.map(function(t){return '<tr><td>'+h(t.id)+' · '+h(t.title)+'</td><td>'+h(projects[t.pid].name)+
 '</td><td>'+h(t.commit)+'</td><td>'+h(t.status)+'</td><td><button class="btn" data-v5="personal-open" data-pid="'+h(t.pid)+
 '" data-task="'+h(t.taskId)+'">进入专业检视</button></td></tr>';}).join('')||
 '<tr><td colspan="5">暂无正式检视任务，须由开发工程师主动提交。</td></tr>')+'</tbody></table></div>';
};
v41ReviewerTasksPage=function(){
 return '<section class="page">'+commonHead('个人工作台 / 我的任务','检视任务待办','正式人工介入任务统一从 reviewTasks 读取，不按单个异议即时生成模拟待办。')+
 v41TaskTable()+'</section>';
};
v41ReviewerTodoWidget=function(){
 return '<div class="mini-list">'+entries().slice(0,4).map(function(t){
  return '<div class="mini-list-row"><div class="grow"><strong>'+h(t.id)+' · '+h(t.title)+'</strong><small>'+
   h(t.commit)+' · '+h(t.status)+'</small></div><button class="op" data-v5="personal-open" data-pid="'+h(t.pid)+'" data-task="'+h(t.taskId)+'">处理</button></div>';
 }).join('')+'<div><button class="btn" data-v41-task="all">查看全部检视待办</button></div></div>';
};
v41ReviewerSummaryWidget=function(){
 return '<div class="compact-metrics"><div class="compact-metric"><span>正式人工检视待办</span><b>'+entries().filter(function(t){return t.status!=='已完成';}).length+
 '</b></div><div class="compact-metric"><span>累计人工介入轮次</span><b>'+entries().length+'</b></div></div>';
};
// Capture V5 interactions before legacy delegated click handlers.
document.addEventListener('click',function(event){
 var b=event.target.closest('[data-v5]');if(!b)return;
 event.preventDefault();event.stopImmediatePropagation();
 var action=b.dataset.v5,d=data(),m=model(d);
 if(action==='drawer-cancel'){closeDrawer();return;}
 if(action==='view-todos'){m.view='todos';m.selected=[];render();return;}
 if(action==='view-professional'){m.view='professional';render();return;}
 if(action==='choose-task'){m.selectedTaskId=b.dataset.task;m.view='professional';m.selected=[];render();return;}
 if(action==='personal-open'){
  var pid=b.dataset.pid;if(!projects[pid])return;
  state.projectId=pid;state.role='reviewer';d=data();m=model(d);
  m.selectedTaskId=b.dataset.task;m.view='professional';state.projectSection='lifecycle';state.lifecycleStage='development';
  setView('project-lifecycle');return;
 }
 if(action==='dev-submit'){if(createReview(d)){v35AI();showToast('已生成一条新的正式人工检视待办');}return;}
 if(state.role!=='reviewer'&&action!=='editor-format'){showToast('请切换至检视工程师角色','warn');return;}
 if(action==='ai-details'){v43OpenAiResults();return;}
 if(action==='issue-detail'){openIssue(b.dataset.id);return;}
 if(action==='batch-feedback'){openBatchFeedback(d,m);return;}
 if(action==='batch-feedback-save'){saveBatch();return;}
 if(action==='batch-noissue'){openBatchNoIssue(d,m);return;}
 if(action==='batch-noissue-save'){saveNoIssue();return;}
 if(action==='batch-meeting'){startMeeting();return;}
 if(action==='meeting-open'){var group=m.meetings.find(function(x){return x.groupId===b.dataset.group;});if(group)openMeeting(group);return;}
 if(action==='meeting-save'){var group=m.meetings.find(function(x){return x.groupId===b.dataset.group;});if(group&&group.status==='待线下评审')saveMeeting(group);return;}
 if(action==='meeting-cancel'){var group=m.meetings.find(function(x){return x.groupId===b.dataset.group;});if(group&&group.status==='待线下评审')cancelMeeting(group);return;}
 if(action==='manual-open'){openManual(d,m);return;}
 if(action==='manual-save'){manualSave();return;}
 if(action==='add-finding'){addFinding(b.dataset.kind);return;}
 if(action==='feedback-open'){openCandidate(d,m);return;}
 if(action==='feedback-save'){saveCandidate();return;}
 if(action==='approve'){approve(d,m);return;}
 if(action==='editor-format'){
  var e=document.getElementById(b.dataset.target);if(!e)return;e.focus();
  document.execCommand(b.dataset.format,false,b.dataset.format==='formatBlock'?'h3':null);return;
 }
},true);
document.addEventListener('change',function(e){
 var box=e.target.closest('[data-v5-issue]');if(box){
  var m=model(data()),id=box.dataset.v5Issue;
  m.selected=box.checked?unique(m.selected.concat(id)):m.selected.filter(function(x){return x!==id;});
 }
 var filter=e.target.closest('[data-v5-filter]');if(filter){model(data()).filter=filter.value;render();}
 var query=e.target.closest('[data-v5-query]');if(query){model(data()).query=query.value;}
},true);
// Override only the legacy developer-dispute write path: disputes remain pending until formal submission.
document.addEventListener('click',function(event){
 var node=event.target.closest('[data-v35="confirm-dispute-batch"],[data-v35="confirm-dispute"]');
 if(!node||state.lifecycleStage!=='development')return;
 event.preventDefault();event.stopImmediatePropagation();
 var d=data(),f=document.getElementById('v45DisputeText')||document.getElementById('v40DisputeText');
 var reason=f&&f.value.trim();if(!reason){showToast('请填写对应问题的具体异议理由','warn');return;}
 var ids=node.dataset.v35==='confirm-dispute'?[node.dataset.id]:(d.v45DisputeIds||[]);
 var matched=d.issues.filter(function(i){return ids.includes(i.id)&&['待整改','待处理','待开发确认'].includes(i.status);});
 if(!matched.length){showToast('问题状态已改变，请重新选择','warn');return;}
 matched.forEach(function(i){i.dispute=reason;i.status='异议待裁定';i.disputeAt=stamp();i.disputeOwner=d.developer;});
 d.v45Selection=[];d.v45DisputeIds=[];
 var modal=document.getElementById('modalRoot');if(modal){modal.classList.remove('show');modal.innerHTML='';}
 v35Log('开发异议暂存 '+matched.map(function(i){return i.id;}).join('、')+'，未创建检视待办');
 d.section='issues';v35AI();showToast('异议已暂存，请在允许时正式提交人工检视');
},true);
// V35 original batch-fix sets AI issues to 待复检 before a new Commit; retain
// the visible state while preventing false closure: only a successful AI run closes them.
var style=document.createElement('style');
style.id='v56-review-v5-styles';
style.textContent=
'.v5-root{display:grid;gap:13px;font-size:12px}.v5-root .v35-panel{margin:0 0 12px}'+
'.v5-tabs{display:flex;gap:8px;margin-bottom:13px}.v5-tabs button{border:1px solid #d3dce9;border-radius:6px;padding:10px 20px;background:#fff;cursor:pointer;color:#475467}.v5-tabs button.active{background:#e9f1ff;border-color:#416fc6;color:#174ea6;font-weight:700}'+
'.v5-columns{display:grid;grid-template-columns:minmax(0,65fr) minmax(0,35fr);gap:15px;align-items:start}.v5-left,.v5-right{min-width:0}.v5-evidence{border-bottom:1px solid #e6eaf1;padding:11px 0}.v5-evidence:last-child{border-bottom:0}.v5-evidence p{margin:7px 0}'+
'.v5-summary{border:1px solid #dce4f2;border-radius:7px;background:#f6faff;padding:13px;line-height:2}.v5-summary b{font-size:14px}'+
'.v5-toolbar,.v5-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 0}.v5-row>*:first-child{margin-right:auto}.v5-toolbar input,.v5-toolbar select,.v5-root input,.v5-root textarea,.v5-root select{border:1px solid #d3dce9;border-radius:5px;padding:7px;font-size:12px;max-width:100%}.v5-root label{display:grid;gap:5px;margin:9px 0;color:#475467}'+
'.v5-table{width:100%;border-collapse:collapse;font-size:11px}.v5-table th,.v5-table td{border-bottom:1px solid #e6eaf0;padding:9px;text-align:left;vertical-align:top;max-width:210px;word-break:break-word}.v5-table th{color:#667085;background:#f8fafc}.v5-table small{display:block;color:#98a2b3;margin-top:3px}.v5-empty{text-align:center;color:#98a2b3;padding:16px}'+
'.v5-note{padding:8px 0;color:#667085;line-height:1.7}.v5-gates{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0}.v5-gate{border:1px solid #dae2ed;padding:12px;border-radius:6px}.v5-gate div{font-size:11px;color:#667085;margin-top:8px;line-height:1.6}'+
'.v5-issue-block{border:1px solid #dde4ee;border-radius:7px;padding:14px;margin:12px 0;background:#fff}.v5-issue-block h3{font-size:13px;margin:0 0 8px}.v5-issue-block p{color:#667085;line-height:1.8}'+
'.v5-editor-tools{display:flex;gap:5px;flex-wrap:wrap;background:#f8fafc;border:1px solid #d7e0ed;border-bottom:0;padding:6px;margin-top:8px}.v5-editor{border:1px solid #d7e0ed;border-radius:0 0 5px 5px;min-height:88px;padding:12px;outline:none;line-height:1.7;overflow-wrap:anywhere}.v5-editor:focus{border-color:#4172c1}.v5-finding{border-left:3px solid #cad7eb;padding:10px;margin:10px 0;background:#fafcff}'+
'@media(max-width:900px){.v5-columns,.v5-gates{grid-template-columns:1fr}.v5-table{font-size:10px}}';
document.head.appendChild(style);
document.title='一体化产品研发系统 · V56.0 检视流程原型';
render();
})();