export type CriteriaOperator = ">" | "<" | "=" | "contains";

export interface CriteriaFilter {
  field: "followers" | "location" | "age";
  op: CriteriaOperator;
  value: number | string;
}

export interface CriteriaSet {
  name: string;
  filters: CriteriaFilter[];
  logic: "AND" | "OR";
  sortField: "followers" | "age";
  sortOrder: "asc" | "desc";
}
