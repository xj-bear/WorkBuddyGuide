import content from '../../../learning/content.generated.json';
export default {
  paths() {
    return content.scenarios.map(category => ({
      params: { categorySlug: category.id },
      content: `---\nlayout: page\ntitle: ${JSON.stringify(category.title)}\ndescription: ${JSON.stringify(category.description + (category.id === 'life' ? '' : '：查看具体场景方案、操作说明、配图与结果核对方法。'))}\n---\n\n<LearningPage view="scenario" />\n`,
    }));
  },
};
