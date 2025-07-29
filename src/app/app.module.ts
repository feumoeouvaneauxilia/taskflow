import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { DashComponent } from './views/dashboard/dash/dash.component';
import { SpinnerModule } from '@coreui/angular';
import { ToastModule } from 'primeng/toast';  // Import ToastModule
import { MessageService } from 'primeng/api';  // Import MessageService
import { DefaultHeaderComponent } from './layout/default-layout/default-header/default-header.component';

@NgModule({
  declarations: [
    AppComponent,
    DashComponent,
    DefaultHeaderComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    SpinnerModule,
    ToastModule  // Add ToastModule here
  ],
  providers: [MessageService], // Add MessageService provider
  bootstrap: [AppComponent]
})
export class AppModule { }
