import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { eSewaService } from "./esewa.service";
import { JwtAuthGuard } from "src/common/auth/AuthGuard";

@ApiTags('eSewa Payments')
@Controller('payments/esewa')
export class eSewaController {
    constructor(private readonly eSewaService: eSewaService) { }
    @Post('initiate/:appointmentId')
    @ApiOperation({ summary: 'Initiate eSewa payment for an appointment' })
    @ApiResponse({
        status: 200,
        description: 'Payment initiated successfully',
        schema: {
            example: {
                success: true,
                message: 'Payment initiated successfully',
                data: {
                    paymentUrl: 'https://esewa.com.np/payment-ui/...',
                },
            },
        },
    })
    async initiatePayment(@Param('appointmentId') appointmentId: string) {
        const result = await this.eSewaService.initiatePayment(appointmentId);
        return {
            message: 'Payment initiated successfully',
            data: result,
        };
    }

    //success route for payment verification
    @Get('success')
    async successGet(@Query('data') encoded: string) {
        const result = await this.eSewaService.verifyPayment(encoded);
        return {
            success: true,
            message: 'Payment verified successfully',
            data: result,
        };
    }

    //temporary failure route for testing
    @Get('failure')
    async paymentFailure() {
        return {
            message: 'Payment failed',
            data: null,
        };
    }
    
}