"""调用浏览器走查脚本；Playwright 使用独立临时配置，不运行 WorkBuddy 任务。"""
from pathlib import Path
import subprocess
import sys

subprocess.run(["node", str(Path(__file__).with_suffix(".mjs")), *sys.argv[1:]], check=True)
