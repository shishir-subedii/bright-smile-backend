import { Controller } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { eSewaService } from "./esewa.service";

@ApiTags('eSewa Payments')
@Controller('payments/esewa')
export class eSewaController {
    constructor(private readonly eSewaService: eSewaService) { }
}