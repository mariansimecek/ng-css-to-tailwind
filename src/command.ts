import { TailwindConverter, TailwindConverterConfig } from "css-to-tailwindcss";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { parse } from "angular-html-parser";
import { ParseTreeResult } from "angular-html-parser/lib/compiler/src/ml_parser/parser";
import globToRegExp from "glob-to-regexp";

yargs(hideBin(process.argv))
  .command(
    "analyze <file>",
    "Analyzes the HTML file",
    (yargs) =>
      yargs
        .options({
          css_file: {
            demandOption: true,
            default: "dist/styles.css",
            describe: "css file to analyze (dist/styles.css)",
            type: "string",
          },
          write: {
            default: false,
            describe: "write to file",
            type: "boolean",
          },
          tailwind_file: {
            describe: "tailwind config file location (tailwind.config.js)",
            type: "string",
          },
          class_blacklist: {
            default: [],
            describe: "class list to ignore",
            type: "array",
          },
        })
        .positional("file", {
          description: "file to analyze (*.html)",
          type: "string",
        }),
    async (argv) => {
      if (!argv.file) {
        throw new Error("file is required");
      }
      const css_file = Bun.file(argv.css_file);

      if (!(await css_file.exists())) {
        console.error("File does not exist:", argv.css_file);
        return;
      }
      const css_content = await css_file.text();

      const html_file = Bun.file(argv.file);
      if (!(await html_file.exists())) {
        console.error("File does not exist:", argv.file);
        return;
      }

      const html_content = await html_file.text();

      if (
        argv.tailwind_file &&
        !(await Bun.file(argv.tailwind_file).exists())
      ) {
        console.error("Tailwind config file not found:", argv.tailwind_file);
        return;
      }

      let tailwind_config: TailwindConverterConfig["tailwindConfig"];

      if (argv.tailwind_file) {
        const tailwind_config_loaded = await analyzeTailwindConfigFile(
          argv.tailwind_file,
        );
        tailwind_config = tailwind_config_loaded;
      }

      function isOnBlackList(c: string) {
        if (!argv.class_blacklist || argv.class_blacklist.length === 0) {
          return false;
        }
        for (const black_item of argv.class_blacklist) {
          const regex = globToRegExp(`${black_item}`);
          if (c === black_item || regex.test(c)) {
            return true;
          }
        }
        return false;
      }

      const tw_nodes = await analyzeCssFile(css_content, tailwind_config);
      const ast = parseHtmlFile(html_content);
      const html_class_groups = grabClasses(ast.rootNodes);

      const class_to_tailwind: Record<string, string[]> = {};

      for (const tw_node of tw_nodes) {
        for (const tw_selector of tw_node.rule.selectors) {
          const selector = tw_selector.replace(/\.|#/g, "");

          if (isOnBlackList(selector)) continue;

          for (const html_class_group of html_class_groups) {
            for (const html_class of html_class_group.split(" ")) {
              if (selector === html_class) {
                class_to_tailwind[html_class] = [
                  ...tw_node.tailwindClasses,
                  ...(class_to_tailwind[html_class] ?? []),
                ];
              }
            }
          }
        }
      }

      const result = new Map<string, string[]>();
      for (const html_class_group of html_class_groups) {
        const tailwindClassesBuffer = new Set<string>();
        for (const html_class of html_class_group.split(" ")) {
          const tailwind_classes = class_to_tailwind[html_class];
          if (tailwind_classes) {
            tailwind_classes.forEach((tw_class) =>
              tailwindClassesBuffer.add(tw_class),
            );
          }
        }
        result.set(html_class_group, Array.from(tailwindClassesBuffer));
      }

      if (argv.write) {
        const newFile = replaceClassesInFile(html_content, result);
        try {
          await Bun.write(argv.file, newFile);
          console.log(`[✅] Wrote file ${argv.file}`);
        } catch (e) {
          console.error(
            `Could not write file ${argv.file} because error: ${e}`,
          );
        }
      } else {
        printResult(result);
      }
    },
  )
  .demandCommand()
  .parse();

function parseHtmlFile(file: string) {
  const ast = parse(file, {
    canSelfClose: true,
    allowHtmComponentClosingTags: true,
  });
  return ast;
}

function printResult(result: Map<string, string[]>) {
  result.forEach((tailwindClasses, html_class) => {
    console.log("\nclass:", html_class);
    console.log(
      "\x1b[36m%s\x1b[0m",
      "tailwind:",
      tailwindClasses.length > 0
        ? tailwindClasses.join(" ")
        : "\x1b[31m No tailwind equivalent found\x1b[0m",
    );
  });
}

function grabClasses(nodes: ParseTreeResult["rootNodes"]) {
  const elementsWithClass = new Set<string>();

  async function findElementsWithClass(
    nodes: ParseTreeResult["rootNodes"],
    level = 1,
  ) {
    for (const rootNode of nodes) {
      if (rootNode.type === "element") {
        for (const attr of rootNode.attrs) {
          if (attr.name === "class") {
            if (!attr.value.includes("{{") && !attr.value.includes("{{")) {
              elementsWithClass.add(attr.value);
            }
          }
        }

        if (rootNode.children) {
          for (const childNode of rootNode.children) {
            findElementsWithClass([childNode], level + 1);
          }
        }
      }
    }
  }

  findElementsWithClass(nodes);
  return Array.from(elementsWithClass);
}

async function analyzeCssFile(
  file: string,
  tailwindConfig?: TailwindConverterConfig["tailwindConfig"] | undefined,
) {
  const converter = new TailwindConverter({
    arbitraryPropertiesIsEnabled: true,
    postCSSPlugins: [],
    tailwindConfig: tailwindConfig,
  });

  const { nodes } = await converter.convertCSS(file);

  return nodes;
}

async function analyzeTailwindConfigFile(file_path: string) {
  try {
    const file = await Bun.file(file_path).text();
    var requireFromString = require("require-from-string");
    const config = requireFromString(file);
    console.log("[✅] Loaded tailwind config file:", file_path);
    return config as TailwindConverterConfig["tailwindConfig"];
  } catch (e) {
    console.error("Could not analyze tailwind config:", e);
  }
}

function replaceClassesInFile(
  html_content: string,
  result: Map<string, string[]>,
) {
  let newFile = `${html_content}`;
  result.forEach((tailwindClasses, html_class) => {
    if (tailwindClasses.length === 0) return;

    let tailwindClassesString = tailwindClasses.join(" ");
    tailwindClassesString = tailwindClassesString.replace(/"/g, "'");

    newFile = newFile.replaceAll(html_class, tailwindClassesString);
  });

  return newFile;
}
