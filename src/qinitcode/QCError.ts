// QCError — QinitCode 错误类型
// @ts-nocheck

export function QCError(msg, line) {
    this.message = 'QinitCode 错误: ' + msg;
    this.line = line || 0;
}
QCError.prototype = Object.create(Error.prototype);
QCError.prototype.constructor = QCError;
