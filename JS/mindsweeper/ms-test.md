I would like to create a client e2e test for my mindsweeper game using playwright. Some other key consideration:
- Asserts
- In some basic scenarios, provide Console Logs output to LLM to help check logs to help fix problems, especially when the test fails..
- Full E2E test - Load in a fixed board state, and create a sequential set of events for each click, where each click has a certain expected outcome


Tests:
- Basic test for onPageLoad in client, making sure to have assert to check tiles are loaded with data, and any error logs