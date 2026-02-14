export interface RequestWithParams extends Request {
    params: Record<string, string>;
}
