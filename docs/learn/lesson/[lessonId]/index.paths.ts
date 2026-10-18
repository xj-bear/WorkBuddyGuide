import content from '../../../../learning/content.generated.json';
export default {
  paths: () => content.lessons.map(lesson => ({
    params: { lessonId: lesson.id },
    content: `---\nlayout: page\ntitle: ${JSON.stringify(lesson.title)}\nsearch: false\nlearningStatus: redirect\n---\n\n<LessonRedirect />\n`,
  })),
};
