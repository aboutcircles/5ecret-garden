<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey';
  import { scaleOrdinal } from 'd3-scale';
  import { schemeCategory10 } from 'd3-scale-chromatic';
  import { formatEther } from 'ethers';

  // Pull in Sankey data from props; default height to 400
  let { graph, startNode, height = 400 } = $props();

  interface TransferPathStep {
    from: string;
    to: string;
    value: string; // or BigInt, etc.
    [key: string]: any;
  }

  interface SankeyNodeExtra extends SankeyNode<{ name: string }, {}> {
    name: string;
  }

  interface SankeyLinkExtra extends SankeyLink<SankeyNodeExtra, { value: number }> {
    value: number;
  }

  // Reference to our SVG element
  let svgEl: SVGSVGElement;
  let width = 0; // Determined at runtime

  // Helper: shorten an Ethereum address
  function shortenAddress(addr: string): string {
    // If it looks like a hex address of typical length, do the usual "0x1234...ABCD"
    if (addr.startsWith('0x') && addr.length >= 10) {
      return addr.slice(0, 6) + '...' + addr.slice(-4);
    }
    // Otherwise, just return the original
    return addr;
  }

  // Build node/link data for d3-sankey
  function buildSankeyData(graphData: TransferPathStep[]) {
    const nodeNames = new Set<string>();
    for (const edge of graphData) {
      nodeNames.add(edge.from);
      nodeNames.add(edge.to);
    }

    const nodes = Array.from(nodeNames).map((name) => ({ name }));

    const links = graphData.map((edge) => {
      const sourceIndex = nodes.findIndex((n) => n.name === edge.from);
      const targetIndex = nodes.findIndex((n) => n.name === edge.to);
      // Convert from wei to ETH, if you wish:
      const linkValue = parseFloat(formatEther(edge.value));

      return {
        source: sourceIndex,
        target: targetIndex,
        value: linkValue,
      };
    });

    return { nodes, links };
  }

  onMount(() => {
    if (!graph || graph.length === 0) return;

    // Measure container width
    width = svgEl.getBoundingClientRect().width;

    const { nodes, links } = buildSankeyData(graph);

    const sankeyGenerator = sankey<SankeyNodeExtra, SankeyLinkExtra>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([
        [0, 0],
        [width, height],
      ]);

    // Compute layout
    const sankeyData = sankeyGenerator({
      nodes: nodes.map((d) => Object.assign({}, d)),
      links: links.map((d) => Object.assign({}, d)),
    });

    // Clear any existing contents
    select(svgEl).selectAll('*').remove();

    // Create main svg
    const svg = select(svgEl)
      .attr('width', '100%')
      .attr('height', height);

    const color = scaleOrdinal(schemeCategory10);

    // Draw links
    svg
      .append('g')
      .selectAll('path')
      .data(sankeyData.links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', '#888')
      .attr('stroke-opacity', 0.5)
      .attr('stroke-width', (d) => Math.max(1, d.width || 1));

    // Draw nodes
    svg
      .append('g')
      .selectAll('rect')
      .data(sankeyData.nodes)
      .enter()
      .append('rect')
      .attr('x', (d) => d.x0 || 0)
      .attr('y', (d) => d.y0 || 0)
      .attr('width', (d) => (d.x1 || 0) - (d.x0 || 0))
      .attr('height', (d) => Math.max(1, (d.y1 || 0) - (d.y0 || 0)))
      .attr('fill', (d) => color(d.name));

    // Node labels with in/out flow and shortened addresses
    svg
      .append('g')
      .selectAll('text')
      .data(sankeyData.nodes)
      .enter()
      .append('text')
      .attr('x', (d) => (d.x0 || 0) - 6)
      .attr('y', (d) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d) => {
        const inflow = (d.targetLinks || []).reduce((acc, l) => acc + l.value, 0);
        const outflow = (d.sourceLinks || []).reduce((acc, l) => acc + l.value, 0);
        return `${shortenAddress(d.name)} (in=${inflow.toFixed(2)}, out=${outflow.toFixed(2)})`;
      })
      .filter((d) => (d.x0 || 0) < width / 2)
      .attr('x', (d) => (d.x1 || 0) + 6)
      .attr('text-anchor', 'start');
  });
</script>

<svg class="w-full" bind:this={svgEl} />
