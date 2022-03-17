import React, { useMemo, useState, useEffect } from 'react';
import { IProps, HTMLDivProps, noop } from '@uiw/utils';
import Icon from '@uiw/react-icon';
import Thead from './Thead';
import { getLevelItems, getAllColumnsKeys } from './util';
import ExpandableComponent from './Expandable';
import TableTr from './TableTr';
import './style/index.less';

// 展开配置
export interface ExpandableType<T> {
  // 展开行
  expandedRowRender?: (record: T, index: number, expanded: boolean) => React.ReactNode;
  // 自定义图标
  expandIcon?: (expanded: boolean, record: T, index: number) => React.ReactNode;
  // 是否允许展开
  rowExpandable?: (record: T) => boolean;
  // 初始时，是否展开所有行
  defaultExpandAllRows?: boolean;
  // 默认展开的行 rowKey数组
  defaultExpandedRowKeys?: Array<T[keyof T] | number>;
  // 控制展开的行 rowKey数组
  expandedRowKeys?: Array<T[keyof T] | number>;
  // 展开的行变化触发
  onExpandedRowsChange?: (expandedRows: Array<T[keyof T] | number>) => void;
  // 点击展开图标触发
  onExpand?: (expanded: boolean, record: T, index: number) => void;
  // 控制树形结构每一层的缩进宽度
  indentSize?: number;
  // 指定树形结构的列名
  childrenColumnName?: string;
}

export type TableColumns<T = any> = {
  title?: string | ((data: TableColumns<T>, rowNum: number, colNum: number) => JSX.Element) | JSX.Element;
  key?: string;
  width?: number;
  colSpan?: number;
  children?: TableColumns<T>[];
  ellipsis?: boolean;
  render?: (text: string, keyName: string, rowData: T, rowNumber: number, columnNumber: number) => React.ReactNode;
  style?: React.CSSProperties;
  [key: string]: any;
};

export interface TableProps<T extends { [key: string]: V } = any, V = any> extends IProps, Omit<HTMLDivProps, 'title'> {
  prefixCls?: string;
  columns?: TableColumns<T>[];
  data?: Array<T>;
  title?: React.ReactNode;
  footer?: React.ReactNode;
  bordered?: boolean;
  empty?: React.ReactNode;
  onCell?: (
    data: { [key: string]: any },
    options: ICellOptions,
    evn: React.MouseEvent<HTMLTableCellElement>,
  ) => void | React.ReactNode;
  onCellHead?: (
    data: TableColumns<T>,
    rowNum: number,
    colNum: number,
    evn: React.MouseEvent<HTMLTableCellElement>,
  ) => void;
  expandable?: ExpandableType<T>;
  rowKey?: keyof T;
}

export interface ICellOptions {
  rowNum: number;
  colNum: number;
  keyName: string;
}
export default function Table<T extends { [key: string]: V }, V>(props: TableProps<T, V> = {}) {
  const {
    prefixCls = 'w-table',
    className,
    columns = [],
    data = [],
    title,
    footer,
    bordered,
    onCell = noop,
    onCellHead = noop,
    empty,
    children,
    expandable,
    rowKey,
    ...other
  } = props;
  const [expandIndex, setExpandIndex] = useState<Array<T[keyof T] | number>>([]);
  useEffect(() => {
    if (expandable) {
      if (expandable.defaultExpandAllRows) {
        setExpandIndex(data.map((it, index) => (rowKey ? it[rowKey] : index)));
        return;
      }
      if (expandable.defaultExpandedRowKeys) {
        setExpandIndex(expandable.defaultExpandedRowKeys);
        return;
      }
    }
  }, []);
  useEffect(() => {
    if (expandable) {
      if (expandable.expandedRowKeys && JSON.stringify(expandable.expandedRowKeys) !== JSON.stringify(expandIndex)) {
        setExpandIndex(expandable.expandedRowKeys);
      }
    }
  }, [expandable?.expandedRowKeys]);

  const isExpandedDom = useMemo(() => {
    return (record: T, index: number) => {
      if (!expandable) {
        return false;
      }
      if (!expandable.expandedRowRender) {
        return false;
      }
      let flag = true;
      if (expandable.rowExpandable) {
        flag = expandable.rowExpandable(record);
      }
      return (
        flag && (
          <tr style={expandIndex.includes(rowKey ? record[rowKey] : index) ? {} : { display: 'none' }}>
            <td style={{ paddingLeft: 16 }} colSpan={columns.length + 1}>
              {expandable.expandedRowRender(record, index, true)}
            </td>
          </tr>
        )
      );
    };
  }, [expandable, expandIndex]);

  const self = useMemo(() => {
    let keys = getAllColumnsKeys<T>(columns);
    let selfColumns: TableColumns<T>[] = [];
    if (expandable?.expandedRowRender) {
      keys = ['uiw-expanded', ...keys];
      selfColumns = [
        {
          title: '',
          key: 'uiw-expanded',
          width: 50,
          align: 'center',
          render: (text, key, record, index) => {
            return (
              <ExpandableComponent
                defaultExpand={
                  expandable.defaultExpandAllRows === undefined
                    ? !!expandable.defaultExpandedRowKeys?.includes(rowKey ? record[rowKey] : index)
                    : !!expandable.defaultExpandAllRows
                }
                onClick={(expand) => {
                  expandable.onExpand?.(expand, record, index);
                  if (expand) {
                    const result = expandIndex.filter((it) => (rowKey ? it !== record[rowKey] : it !== index));
                    expandable.onExpandedRowsChange ? expandable.onExpandedRowsChange(result) : setExpandIndex(result);
                  } else {
                    const result = [...expandIndex, rowKey ? record[rowKey] : index];
                    expandable.onExpandedRowsChange ? expandable.onExpandedRowsChange(result) : setExpandIndex(result);
                  }
                }}
                expandIcon={(expand) => {
                  if (expandable.rowExpandable && !expandable.rowExpandable?.(record)) {
                    return null;
                  }
                  if (expandable.expandIcon) {
                    return expandable.expandIcon(expand, record, index);
                  }
                  return expand ? <Icon type="minus-square-o" /> : <Icon type="plus-square-o" />;
                }}
              />
            );
          },
        },
        ...columns,
      ];
    } else {
      selfColumns = [...columns];
    }
    return {
      keys,
      selfColumns,
    };
  }, [columns, expandIndex]);

  const cls = [prefixCls, className, bordered ? `${prefixCls}-bordered` : null].filter(Boolean).join(' ').trim();
  const { header, render, ellipsis } = getLevelItems(self.selfColumns);

  return (
    <div>
      <div style={{ overflowY: 'scroll' }} className={cls} {...other}>
        <table style={ellipsis ? { tableLayout: 'fixed' } : {}}>
          {title && <caption>{title}</caption>}
          {columns && columns.length > 0 && <Thead onCellHead={onCellHead} data={header} />}
          {data && data.length > 0 && (
            <tbody>
              <TableTr
                rowKey={rowKey}
                data={data}
                keys={self.keys}
                render={render}
                ellipsis={ellipsis}
                prefixCls={prefixCls}
                onCell={onCell}
                hierarchy={0}
                isExpandedDom={isExpandedDom}
                indentSize={expandable?.indentSize || 16}
                childrenColumnName={expandable?.childrenColumnName || 'children'}
              />
            </tbody>
          )}
          {data && data.length === 0 && empty && (
            <tbody>
              <tr>
                <td colSpan={columns.length} style={{ position: 'relative', left: 0 }}>
                  {empty}
                </td>
              </tr>
            </tbody>
          )}
          {props.children}
        </table>
      </div>
      {footer && <div className={`${prefixCls}-footer`}>{footer}</div>}
    </div>
  );
}
