export type MaxButtonType =
  | 'callback'
  | 'message'
  | 'link'
  | 'open_app'
  | 'clipboard'
  | 'request_contact'
  | 'request_geo_location';

export interface MaxButtonItem {
  id: string;
  type: MaxButtonType;
  text: string;
  payload: string;
  url: string;
  row: number;
  col: number;
}
