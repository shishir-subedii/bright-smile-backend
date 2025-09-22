import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { eSewaService } from "./esewa.service";
import { JwtAuthGuard } from "src/common/auth/AuthGuard";
import { Response } from "express";
@ApiTags('eSewa Payments')
@Controller('payments/esewa')
export class eSewaController {
    constructor(private readonly eSewaService: eSewaService) { }
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
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
    async initiatePayment(@Param('appointmentId') appointmentId: string, @Req() req) {
        const result = await this.eSewaService.initiatePayment(req.user.id, appointmentId);
        return {
            message: 'Payment initiated successfully',
            data: result,
        };
    }

    //success route for payment verification --> GET for development
    @Get('success')
    async successGet(@Query('data') encoded: string) {
        const result = await this.eSewaService.verifyPayment(encoded);
        return {
            success: true,
            message: 'Payment verified successfully',
            data: result,
        };
    }
    /*
        @Get('success')
    async successGet(@Query('data') encoded: string, @Res() res: Response) {
        try {
            await this.eSewaService.verifyPayment(encoded);
            // redirect user to frontend
            return res.redirect('https://jobghar-frontend.vercel.app/');
        } catch (err) {
            console.error(err);
            // redirect to frontend failure page
            return res.redirect('https://jobghar-frontend.vercel.app/payment/failure');
        }
    }
    */

    //success route for payment verification --> POST for production
    @Post('success')
    async successPost(@Body('data') encoded: string) {
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
        // const res = await this.eSewaService.checkPaymentStatus('cc446ec9-15d9-475e-a389-e662c147775a', '55bfc54e-cd52-4bb8-bc40-325ac702a689')
        // console.log(res)
        return {
            message: 'Payment failed',
            data: null,
        };
    }

    //check payment status
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @Get('status/:appointmentId')
    @ApiOperation({ summary: 'Check eSewa payment status for an appointment' })
    async checkPaymentStatus(@Param('appointmentId') appointmentId: string, @Req() req) {
        const result = await this.eSewaService.checkPaymentStatus(req.user.id, appointmentId);
        return {
            success: true,
            message: 'Payment status retrieved successfully',
            data: result,
        };
    }    
    
}