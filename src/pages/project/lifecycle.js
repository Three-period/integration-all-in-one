/** 全生命周期页：按阶段渲染内容。 */
import { App } from '../../core/app.js';
import { commonHead } from '../../components/shell.js';
import { lifecycleReferenceRail, renderProjectShell } from './shell.js';
import { state } from '../../store/state.js';

function renderLifecycle() {
  var body = {
    planning: App.renderPlanning,
    requirements: App.renderRequirements,
    design: App.renderDesign,
    development: App.renderDevelopment,
    testing: App.renderTesting,
    release: App.renderClosing,
    closing: App.renderRelease,
  }[state.lifecycleStage]();
  var hideHead =
    ['requirements', 'planning', 'design', 'development', 'testing', 'closing', 'release'].indexOf(
      state.lifecycleStage,
    ) > -1;
  var head = hideHead
    ? ''
    : commonHead(
        '项目管理 / 全生命周期',
        '全生命周期',
        '按项目类型流程模板组织从规划、需求到发布和结项的完整研发过程。',
        '<button class="btn" data-action="open-flow">流程记录</button><button class="btn" data-action="share">共享</button>',
      );
  return renderProjectShell(
    head + lifecycleReferenceRail() + '<div class="stage-block">' + body + '</div>',
  );
}
App.renderLifecycle = renderLifecycle;
