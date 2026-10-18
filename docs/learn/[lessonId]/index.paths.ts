import content from '../../../learning/content.generated.json';
export default {
  paths() {
    return [...content.bluebookLessons, ...content.lessons, ...content.scenarioGuides].map(lesson => ({
      params: { lessonId: lesson.id },
      content: `---\nlayout: page\ntitle: ${JSON.stringify(lesson.title)}\ndescription: ${JSON.stringify(lesson.summary)}\nsearch: ${lesson.status === 'published'}\nlearningStatus: ${lesson.status}\n---\n\n<LearningPage view="lesson" />\n`,
    }));
  },
};
