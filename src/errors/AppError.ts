export abstract class AppError extends Error {
  public readonly cause?: unknown;

  protected constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      cause: this.cause instanceof Error ? this.cause.message : String(this.cause),
    };
  }
}
