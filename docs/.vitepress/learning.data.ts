import { defineLoader } from 'vitepress';
import { prepareLearning } from '../../learning/prepare.mjs';
import type { LearningContent } from '../../learning/types';

export declare const data: LearningContent;
export default defineLoader({
  watch: ['../../learning/lesson-map.json', '../../learning/tutorials/*.json', '../../learning/scenario-guides.json', '../../learning/scenario-workflows.json', '../../learning/work-scenarios.json', '../../learning/lesson-editorial.json', '../bluebook/**/*.md', '../cases/**/*.md', '../solve/cases/**/*.md'],
  async load() { return prepareLearning(); },
});
