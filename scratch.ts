import { parseTime } from './src/utils/timeParser';

const testCommand = (text: string) => {
  const parts = text.split(/\s+/);
  let timeText = "";
  let content = "";
  let parsed = null;

  for (let i = parts.length; i > 0; i--) {
    const attemptText = parts.slice(0, i).join(' ');
    const attemptParse = parseTime(attemptText);
    if (attemptParse) {
       timeText = attemptText;
       content = parts.slice(i).join(' ');
       parsed = attemptParse;
       break;
    }
  }

  if (!parsed && parts.length > 0) {
      timeText = parts[0];
      content = parts.slice(1).join(' ');
  }
  console.log(`\nTEXT: "${text}"`);
  console.log("-> timeText:", timeText);
  console.log("-> content:", content);
  console.log("-> parsed:", parsed?.display);
}

testCommand("17/4 7h20 uống nước");
testCommand("14h30 nhắc nộp bài");
testCommand("30m tắt bếp");
testCommand("ngày mai đi chơi");
