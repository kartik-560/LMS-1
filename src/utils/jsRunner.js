export const runJavaScriptTestCases = async (userCode, testCases) => {
  const results = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    let logs = [];

    const customConsole = {
      log: (...args) => {
        logs.push(args.map(a => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
      }
    };

    try {
      // Execute within an isolated Function container
      const scriptToRun = `
        const console = customConsole;
        ${userCode}
        
        try {
          if (typeof calculateTotal === 'function') {
            const inputVal = ${tc.input || 'null'};
            const res = calculateTotal(inputVal);
            if (res !== undefined) console.log(res);
          }
        } catch(e) {
          console.log("Error: " + e.message);
        }
      `;

      const runnerFn = new Function("customConsole", scriptToRun);
      runnerFn(customConsole);

      const actualOutput = logs.join("\n").trim();
      const expectedOutput = String(tc.expectedOutput || "").trim();

      results.push({
        testCaseNumber: i + 1,
        input: tc.input || "(Empty)",
        expected: expectedOutput,
        actual: actualOutput,
        passed: actualOutput === expectedOutput,
        isError: false
      });
    } catch (err) {
      results.push({
        testCaseNumber: i + 1,
        input: tc.input || "(Empty)",
        expected: tc.expectedOutput,
        actual: err.message,
        passed: false,
        isError: true
      });
    }
  }

  return results;
};