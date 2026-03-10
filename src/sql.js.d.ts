declare module 'sql.js' {
  interface Database {
    exec(sql: string): { columns: string[]; values: any[][] }[];
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number>) => Database;
  }

  interface InitSqlJsOptions {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(options?: InitSqlJsOptions): Promise<SqlJsStatic>;
}
