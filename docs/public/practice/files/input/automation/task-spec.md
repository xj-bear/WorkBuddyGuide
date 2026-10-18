# 同一输入重复试跑：虚构工作摘要
输入只读 input/weekly-notes.md；规则版本 v1。
先计算输入文件 SHA-256，输出 output/reliable/weekly-digest.md。
状态保存在 output/reliable/run-state.json，记录输入哈希、规则版本、状态和输出路径。
相同输入、相同规则且输出仍存在时，重跑应标记 skipped，不追加重复正文。
输入或旧产物缺失时先说明原因，不把旧结果冒充新产物；写入只在 output/reliable/。
不要连接外部系统，不发送消息。
