/**
 * Example: Claude agent using litebeam via MCP
 *
 * This is a minimal Claude agent that connects to litebeam and uses it to
 * route microservice calls. The agent can generate images, translate text,
 * search the web, and more — without knowing which vendor handles each request.
 *
 * Prerequisites:
 *   npm install @anthropic-ai/sdk @modelcontextprotocol/sdk
 *
 * Usage:
 *   LITEBEAM_API_KEY=sk-litebeam-... ANTHROPIC_API_KEY=... npx tsx claude-agent.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const LITEBEAM_KEY = process.env['LITEBEAM_API_KEY']!;
const LITEBEAM_URL = 'https://mcp.litebeam.xyz/mcp';

async function main() {
  // Connect to litebeam MCP server
  const mcp = new Client({ name: 'claude-agent-example', version: '1.0.0' }, { capabilities: {} });
  await mcp.connect(new StreamableHTTPClientTransport(
    new URL(LITEBEAM_URL),
    { requestInit: { headers: { Authorization: `Bearer ${LITEBEAM_KEY}` } } },
  ));

  // Get the tool list from litebeam
  const { tools } = await mcp.listTools();

  // Create Anthropic client
  const anthropic = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content:
        'Search the web for the most talked-about AI model released in the last 7 days. ' +
        'Then generate a photorealistic image that captures what makes it significant. ' +
        'Finally, find the current ETH/USDC price and include it in your summary — ' +
        'I want to know what the AI landscape looks like right now, visually and financially.',
    },
  ];

  console.log('Running agent...\n');

  // Agentic loop
  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 4096,
      tools: tools.map(t => ({
        name: t.name,
        description: t.description ?? '',
        input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
      })),
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(b => b.type === 'text');
      console.log('Agent response:', text?.text);
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        console.log(`→ ${block.name}`, JSON.stringify(block.input).slice(0, 120));

        try {
          const result = await mcp.callTool(block.name, block.input as Record<string, unknown>);
          const content = result.content?.[0];
          const text    = content && 'text' in content ? content.text : JSON.stringify(result);

          console.log(`← ${block.name} (${text.length} chars)\n`);

          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: text });
        } catch (err) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }
  }

  await mcp.close();
}

main().catch(console.error);
