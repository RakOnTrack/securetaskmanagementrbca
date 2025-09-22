import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@rbcaproject/data';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
