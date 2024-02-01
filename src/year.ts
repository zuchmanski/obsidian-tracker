import * as d3 from "d3";
import { RenderInfo, YearInfo, Dataset } from "./data";

function Calendar(yearInfo: YearInfo, renderInfo: RenderInfo, canvas: HTMLElement, rerender: Function) {
  const width = 945; // width of the chart
  const cellSize = 17; // height of a day
  const yCalendarOffset = 30; // height of the header
  const height = cellSize * 9 + yCalendarOffset; // height of a week (5 days + padding)

  // Define formatting functions for the axes and tooltips.
  const formatValue = d3.format(".1");
  const formatDate = d3.utcFormat("%Y-%m-%d");
  const formatDay = (i: number) => "SMTWTFS"[i];
  const formatMonth = d3.utcFormat("%b");

  // Helpers to compute a day’s position in the week.
  const timeWeek = d3.utcMonday;
  const countDay = (i: number) => (i + 6) % 7;

  const data = d3.range(365).map(function (i) {
    const date = window.moment.utc(`${yearInfo.selectedYear}-01-01`, "YYYY-MM-DD").add(i, 'days');
    let value: number = null;

    renderInfo.datasets.getDatasets().forEach((dataset) => {
      const partialValue = dataset.getValue(date);

      if (partialValue == null) return;

      value += partialValue;
    })

    return {
      date: date.toDate(),
      value: value,
    }
  })

  const color = d3.scaleQuantize(yearInfo.range, yearInfo.colors);

  // Group data by year, in reverse input order. (Since the dataset is chronological,
  // this will show years in reverse chronological order.)
  const years = d3.groups(data, d => d.date.getUTCFullYear()).reverse();

  // A function that draws a thin white line to the left of each month.
  function pathMonth(t: Date) {
    const d = Math.max(0, Math.min(7, countDay(t.getUTCDay())));
    const w = timeWeek.count(d3.utcYear(t), t);
    return `${d === 0 ? `M${w * cellSize},0`
: d === 7 ? `M${(w + 1) * cellSize},0`
: `M${(w + 1) * cellSize},0V${d * cellSize + yCalendarOffset}H${w * cellSize}`}V${7 * cellSize + yCalendarOffset}`;
  }

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height * years.length)
    .attr("viewBox", [0, 0, width, height * years.length])
    .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

  const year = svg.selectAll("g")
    .data(years)
    .join("g")
    .attr("transform", (d, i) => `translate(40.5,${height * i + cellSize * 1.5})`);

  year.append("text")
    .attr("x", -10)
    .attr("y", -1)
    .attr("font-size", 12)
    .attr("font-weight", "bold")
    .attr("text-anchor", "start")
    .text("<")
    .style("cursor", "pointer")
    .on("click", () => {
      yearInfo.selectedYear = yearInfo.selectedYear - 1;

      rerender();
    });

  year.append("text")
    .attr("x", 0)
    .attr("y", 2)
    .attr("font-size", 18)
    .attr("font-weight", "bold")
    .attr("text-anchor", "start")
    .text(([key]) => key);

  year.append("text")
    .attr("x", 42)
    .attr("y", -1)
    .attr("font-size", 12)
    .attr("font-weight", "bold")
    .attr("text-anchor", "start")
    .text(">")
    .style("cursor", "pointer")
    .on("click", () => {
      yearInfo.selectedYear = yearInfo.selectedYear + 1;

      rerender();
    });

  year.append("text")
    .attr("transform", `translate(${26 * cellSize},0)`)
    .attr("font-size", 20)
    .attr("font-weight", "bold")
    .attr("text-anchor", "middle")
    .text(yearInfo.title);

  year.append("g")
    .attr("text-anchor", "end")
    .selectAll()
    .data(d3.range(0, 7))
    .join("text")
    .attr("x", -5)
    .attr("y", i => (countDay(i) + 0.5) * cellSize + yCalendarOffset)
    .attr("dy", "0.31em")
    .text(formatDay);

  year.append("g")
    .selectAll()
    .data(([, values]) => values)
    .join("rect")
    .attr("width", cellSize - 1)
    .attr("height", cellSize - 1)
    .attr("x", d => timeWeek.count(d3.utcYear(d.date), d.date) * cellSize + 0.5)
    .attr("y", d => countDay(d.date.getUTCDay()) * cellSize + 0.5 + yCalendarOffset)
    .attr("fill", d => d.value === null ? "#EBEDF0" : color(d.value))
    .append("title")
    .text(d => `${formatDate(d.date)}
${formatValue(d.value)}`);

  const month = year.append("g")
    .selectAll()
    .data(([, values]) => d3.utcMonths(d3.utcMonth(values[0].date), values.at(-1).date))
    .join("g");

  month.filter((d, i) => i && i >= 0).append("path")
    .attr("fill", "none")
    .attr("stroke", "#fff")
    .attr("stroke-width", 3)
    .attr("d", pathMonth);

  month.append("text")
    .attr("x", d => timeWeek.count(d3.utcYear(d), timeWeek.ceil(d)) * cellSize + 2)
    .attr("y", -5 + yCalendarOffset)
    .text(formatMonth);

  return svg;
}

export function renderYear(
  canvas: HTMLElement,
  renderInfo: RenderInfo,
  yearInfo: YearInfo,
) {
  if (!renderInfo || !yearInfo) return;

  const render = () => {
    d3.select(canvas).select("svg").remove();

    d3.select(canvas).append(() => Calendar(yearInfo, renderInfo, canvas, render).node());
  }

  render();
}
