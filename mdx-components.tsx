import type { MDXComponents } from "mdx/types";

import { Callout } from "@/components/mdx/Callout/Callout";
import { ChemFigure } from "@/components/mdx/ChemFigure/ChemFigure";
import { DataTable } from "@/components/mdx/DataTable/DataTable";
import { Example } from "@/components/mdx/Example/Example";
import { Hint } from "@/components/mdx/Hint/Hint";
import { Math } from "@/components/mdx/Math/Math";
import { Solution } from "@/components/mdx/Solution/Solution";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    ChemFigure,
    DataTable,
    Example,
    Hint,
    Math,
    Solution,
  };
}
