export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_preferences: {
        Row: {
          business_name: string
          created_at: string
          currency_symbol: string
          default_base_amount: number
          default_base_hours: number
          default_base_km: number
          default_base_package: string
          default_driver_name: string
          default_extra_hour_rate: number
          default_extra_km_rate: number
          default_vehicle_model: string
          default_vehicle_number: string
          time_format: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name?: string
          created_at?: string
          currency_symbol?: string
          default_base_amount?: number
          default_base_hours?: number
          default_base_km?: number
          default_base_package?: string
          default_driver_name?: string
          default_extra_hour_rate?: number
          default_extra_km_rate?: number
          default_vehicle_model?: string
          default_vehicle_number?: string
          time_format?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          currency_symbol?: string
          default_base_amount?: number
          default_base_hours?: number
          default_base_km?: number
          default_base_package?: string
          default_driver_name?: string
          default_extra_hour_rate?: number
          default_extra_km_rate?: number
          default_vehicle_model?: string
          default_vehicle_number?: string
          time_format?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_parties: {
        Row: {
          address: string | null
          company_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_parties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      bills: {
        Row: {
          advance_amount: number | null
          airport_parking: number | null
          balance_amount: number | null
          base_amount: number | null
          base_hours: number | null
          base_km: number | null
          base_package: string | null
          billing_party_id: string | null
          client_request_id: string | null
          closing_date: string | null
          closing_kilometer: number | null
          closing_time: string | null
          company_id: string | null
          created_at: string
          customer_name: string | null
          date: string | null
          driver_id: string | null
          driver_name: string | null
          end_location: string | null
          extra_hour_amount: number | null
          extra_hour_rate: number | null
          extra_hours: number | null
          extra_km: number | null
          extra_km_amount: number | null
          extra_km_rate: number | null
          fastag: number | null
          garage_time: string | null
          guest_id: string | null
          guest_name: string | null
          guest_salutation: string | null
          id: string
          kilometer_amount: number | null
          night_charges: number | null
          notes: string | null
          opening_kilometer: number | null
          organization_id: string
          other_charges: number | null
          parking_charges: number | null
          passenger_name: string | null
          pending_amount: number | null
          permit_charges: number | null
          rate_per_kilometer: number | null
          remarks: string | null
          reporting_place: string | null
          reporting_time: string | null
          road_parking: number | null
          start_location: string | null
          title_prefix: string | null
          toll_charges: number | null
          total_amount: number | null
          total_hours: number | null
          total_kilometers: number | null
          total_km: number | null
          trip_date: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_number: string | null
          whatsapp_number: string | null
        }
        Insert: {
          advance_amount?: number | null
          airport_parking?: number | null
          balance_amount?: number | null
          base_amount?: number | null
          base_hours?: number | null
          base_km?: number | null
          base_package?: string | null
          billing_party_id?: string | null
          client_request_id?: string | null
          closing_date?: string | null
          closing_kilometer?: number | null
          closing_time?: string | null
          company_id?: string | null
          created_at?: string
          customer_name?: string | null
          date?: string | null
          driver_id?: string | null
          driver_name?: string | null
          end_location?: string | null
          extra_hour_amount?: number | null
          extra_hour_rate?: number | null
          extra_hours?: number | null
          extra_km?: number | null
          extra_km_amount?: number | null
          extra_km_rate?: number | null
          fastag?: number | null
          garage_time?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_salutation?: string | null
          id?: string
          kilometer_amount?: number | null
          night_charges?: number | null
          notes?: string | null
          opening_kilometer?: number | null
          organization_id: string
          other_charges?: number | null
          parking_charges?: number | null
          passenger_name?: string | null
          pending_amount?: number | null
          permit_charges?: number | null
          rate_per_kilometer?: number | null
          remarks?: string | null
          reporting_place?: string | null
          reporting_time?: string | null
          road_parking?: number | null
          start_location?: string | null
          title_prefix?: string | null
          toll_charges?: number | null
          total_amount?: number | null
          total_hours?: number | null
          total_kilometers?: number | null
          total_km?: number | null
          trip_date?: string | null
          updated_at?: string
          user_id: string
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_number?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          advance_amount?: number | null
          airport_parking?: number | null
          balance_amount?: number | null
          base_amount?: number | null
          base_hours?: number | null
          base_km?: number | null
          base_package?: string | null
          billing_party_id?: string | null
          client_request_id?: string | null
          closing_date?: string | null
          closing_kilometer?: number | null
          closing_time?: string | null
          company_id?: string | null
          created_at?: string
          customer_name?: string | null
          date?: string | null
          driver_id?: string | null
          driver_name?: string | null
          end_location?: string | null
          extra_hour_amount?: number | null
          extra_hour_rate?: number | null
          extra_hours?: number | null
          extra_km?: number | null
          extra_km_amount?: number | null
          extra_km_rate?: number | null
          fastag?: number | null
          garage_time?: string | null
          guest_id?: string | null
          guest_name?: string | null
          guest_salutation?: string | null
          id?: string
          kilometer_amount?: number | null
          night_charges?: number | null
          notes?: string | null
          opening_kilometer?: number | null
          organization_id?: string
          other_charges?: number | null
          parking_charges?: number | null
          passenger_name?: string | null
          pending_amount?: number | null
          permit_charges?: number | null
          rate_per_kilometer?: number | null
          remarks?: string | null
          reporting_place?: string | null
          reporting_time?: string | null
          road_parking?: number | null
          start_location?: string | null
          title_prefix?: string | null
          toll_charges?: number | null
          total_amount?: number | null
          total_hours?: number | null
          total_kilometers?: number | null
          total_km?: number | null
          trip_date?: string | null
          updated_at?: string
          user_id?: string
          vehicle_id?: string | null
          vehicle_name?: string | null
          vehicle_number?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bills_billing_party_id_fkey"
            columns: ["billing_party_id"]
            isOneToOne: false
            referencedRelation: "billing_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_assignments: {
        Row: {
          created_at: string
          driver_id: string
          ended_at: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          ended_at?: string | null
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          ended_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_assignments_driver_fk"
            columns: ["driver_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_assignments_vehicle_fk"
            columns: ["vehicle_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_type: Database["public"]["Enums"]["organization_business_type"]
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          business_type?: Database["public"]["Enums"]["organization_business_type"]
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          business_type?: Database["public"]["Enums"]["organization_business_type"]
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_payments: {
        Row: {
          amount: number
          billing_party_id: string
          client_request_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string | null
          payment_type: string
          reference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_party_id: string
          client_request_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          payment_date: string
          payment_method?: string | null
          payment_type: string
          reference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_party_id?: string
          client_request_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string | null
          payment_type?: string
          reference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_payments_billing_party_id_fkey"
            columns: ["billing_party_id"]
            isOneToOne: false
            referencedRelation: "billing_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          make_model: string | null
          organization_id: string
          registration_number: string
          registration_number_normalized: string | null
          status: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          make_model?: string | null
          organization_id: string
          registration_number: string
          registration_number_normalized?: string | null
          status?: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          make_model?: string | null
          organization_id?: string
          registration_number?: string
          registration_number_normalized?: string | null
          status?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_driver_to_vehicle: {
        Args: {
          p_driver_id: string
          p_organization_id: string
          p_vehicle_id: string
        }
        Returns: {
          created_at: string
          driver_id: string
          ended_at: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        SetofOptions: {
          from: "*"
          to: "driver_vehicle_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      calculate_bill_values: {
        Args: {
          p_airport_parking: number
          p_base_amount: number
          p_base_hours: number
          p_base_km: number
          p_closing_kilometer: number
          p_extra_hour_rate: number
          p_extra_km_rate: number
          p_fastag: number
          p_opening_kilometer: number
          p_road_parking: number
          p_total_hours: number
          p_total_km: number
        }
        Returns: {
          extra_hour_amount: number
          extra_hours: number
          extra_km: number
          extra_km_amount: number
          total_amount: number
          total_km: number
        }[]
      }
      create_bill:
        | {
            Args: {
              p_advance_amount: number
              p_airport_parking: number
              p_base_amount: number
              p_base_hours: number
              p_base_km: number
              p_base_package: string
              p_billing_party_id: string
              p_client_request_id: string
              p_closing_date: string
              p_closing_kilometer: number
              p_closing_time: string
              p_company_id: string
              p_driver_id: string
              p_driver_name: string
              p_extra_hour_rate: number
              p_extra_km_rate: number
              p_fastag: number
              p_garage_time: string
              p_guest_id: string
              p_guest_name: string
              p_guest_salutation: string
              p_notes: string
              p_opening_kilometer: number
              p_pending_amount: number
              p_reporting_place: string
              p_reporting_time: string
              p_road_parking: number
              p_total_hours: number
              p_total_km: number
              p_trip_date: string
              p_vehicle_id: string
              p_vehicle_name: string
              p_vehicle_number: string
              p_whatsapp_number: string
            }
            Returns: {
              advance_amount: number | null
              airport_parking: number | null
              balance_amount: number | null
              base_amount: number | null
              base_hours: number | null
              base_km: number | null
              base_package: string | null
              billing_party_id: string | null
              client_request_id: string | null
              closing_date: string | null
              closing_kilometer: number | null
              closing_time: string | null
              company_id: string | null
              created_at: string
              customer_name: string | null
              date: string | null
              driver_id: string | null
              driver_name: string | null
              end_location: string | null
              extra_hour_amount: number | null
              extra_hour_rate: number | null
              extra_hours: number | null
              extra_km: number | null
              extra_km_amount: number | null
              extra_km_rate: number | null
              fastag: number | null
              garage_time: string | null
              guest_id: string | null
              guest_name: string | null
              guest_salutation: string | null
              id: string
              kilometer_amount: number | null
              night_charges: number | null
              notes: string | null
              opening_kilometer: number | null
              organization_id: string
              other_charges: number | null
              parking_charges: number | null
              passenger_name: string | null
              pending_amount: number | null
              permit_charges: number | null
              rate_per_kilometer: number | null
              remarks: string | null
              reporting_place: string | null
              reporting_time: string | null
              road_parking: number | null
              start_location: string | null
              title_prefix: string | null
              toll_charges: number | null
              total_amount: number | null
              total_hours: number | null
              total_kilometers: number | null
              total_km: number | null
              trip_date: string | null
              updated_at: string
              user_id: string
              vehicle_id: string | null
              vehicle_name: string | null
              vehicle_number: string | null
              whatsapp_number: string | null
            }
            SetofOptions: {
              from: "*"
              to: "bills"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              p_advance_amount: number
              p_airport_parking: number
              p_base_amount: number
              p_base_hours: number
              p_base_km: number
              p_base_package: string
              p_billing_party_id: string
              p_closing_date: string
              p_closing_kilometer: number
              p_closing_time: string
              p_company_id: string
              p_driver_id: string
              p_driver_name: string
              p_extra_hour_rate: number
              p_extra_km_rate: number
              p_fastag: number
              p_garage_time: string
              p_guest_id: string
              p_guest_name: string
              p_guest_salutation: string
              p_notes: string
              p_opening_kilometer: number
              p_pending_amount: number
              p_reporting_place: string
              p_reporting_time: string
              p_road_parking: number
              p_total_hours: number
              p_total_km: number
              p_trip_date: string
              p_vehicle_id: string
              p_vehicle_name: string
              p_vehicle_number: string
              p_whatsapp_number: string
            }
            Returns: {
              advance_amount: number | null
              airport_parking: number | null
              balance_amount: number | null
              base_amount: number | null
              base_hours: number | null
              base_km: number | null
              base_package: string | null
              billing_party_id: string | null
              client_request_id: string | null
              closing_date: string | null
              closing_kilometer: number | null
              closing_time: string | null
              company_id: string | null
              created_at: string
              customer_name: string | null
              date: string | null
              driver_id: string | null
              driver_name: string | null
              end_location: string | null
              extra_hour_amount: number | null
              extra_hour_rate: number | null
              extra_hours: number | null
              extra_km: number | null
              extra_km_amount: number | null
              extra_km_rate: number | null
              fastag: number | null
              garage_time: string | null
              guest_id: string | null
              guest_name: string | null
              guest_salutation: string | null
              id: string
              kilometer_amount: number | null
              night_charges: number | null
              notes: string | null
              opening_kilometer: number | null
              organization_id: string
              other_charges: number | null
              parking_charges: number | null
              passenger_name: string | null
              pending_amount: number | null
              permit_charges: number | null
              rate_per_kilometer: number | null
              remarks: string | null
              reporting_place: string | null
              reporting_time: string | null
              road_parking: number | null
              start_location: string | null
              title_prefix: string | null
              toll_charges: number | null
              total_amount: number | null
              total_hours: number | null
              total_kilometers: number | null
              total_km: number | null
              trip_date: string | null
              updated_at: string
              user_id: string
              vehicle_id: string | null
              vehicle_name: string | null
              vehicle_number: string | null
              whatsapp_number: string | null
            }
            SetofOptions: {
              from: "*"
              to: "bills"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      create_owner_payment: {
        Args: {
          p_amount: number
          p_billing_party_id: string
          p_client_request_id: string
          p_notes: string
          p_payment_date: string
          p_payment_method: string
          p_payment_type: string
          p_reference: string
        }
        Returns: {
          amount: number
          billing_party_id: string
          client_request_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string | null
          payment_type: string
          reference: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "owner_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      end_driver_vehicle_assignment: {
        Args: { p_organization_id: string; p_vehicle_id: string }
        Returns: {
          created_at: string
          driver_id: string
          ended_at: string | null
          id: string
          organization_id: string
          status: string
          updated_at: string
          vehicle_id: string
        }
        SetofOptions: {
          from: "*"
          to: "driver_vehicle_assignments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_billing_party_ledger: {
        Args: { p_billing_party_id: string; p_organization_id: string }
        Returns: {
          credit_amount: number
          debit_amount: number
          description: string
          entry_date: string
          entry_type: string
          reference_id: string
          running_balance: number
        }[]
      }
      get_billing_party_statement: {
        Args: {
          p_billing_party_id: string
          p_from_date: string
          p_organization_id: string
          p_to_date: string
        }
        Returns: {
          advance_available: number
          billing_party_id: string
          closing_balance: number
          closing_outstanding: number
          company_name: string
          credit_amount: number
          debit_amount: number
          description: string
          display_name: string
          entry_date: string
          entry_type: string
          from_date: string
          opening_balance: number
          reference_id: string
          running_balance: number
          to_date: string
          total_billed: number
          total_received: number
        }[]
      }
      get_billing_party_summaries: {
        Args: { p_organization_id: string }
        Returns: {
          advance_credit: number
          bill_count: number
          billing_party_id: string
          company_name: string
          display_name: string
          latest_bill_date: string
          latest_payment_date: string
          net_balance: number
          outstanding_amount: number
          payment_count: number
          total_billed: number
          total_received: number
        }[]
      }
      get_dashboard_monthly_billing: {
        Args: { p_first_month: string; p_organization_id: string }
        Returns: {
          amount: number
          month_start: string
        }[]
      }
      get_dashboard_recent_activity: {
        Args: { p_limit?: number; p_organization_id: string }
        Returns: {
          activity_at: string
          activity_type: string
          amount: number
          business_date: string
          record_id: string
          title: string
        }[]
      }
      get_dashboard_summary: {
        Args: {
          p_organization_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          advance_owners: number
          billing_total: number
          current_outstanding: number
          outstanding_owners: number
          payments_received: number
          total_advance: number
          trips_billed: number
        }[]
      }
      get_dashboard_top_owners: {
        Args: {
          p_limit?: number
          p_month_start: string
          p_organization_id: string
        }
        Returns: {
          billed_amount: number
          billing_party_id: string
          display_name: string
          outstanding_amount: number
        }[]
      }
      is_mfa_requirement_satisfied: { Args: never; Returns: boolean }
      query_bills: {
        Args: {
          p_billing_party_id?: string
          p_date_from?: string
          p_date_to?: string
          p_organization_id: string
          p_page: number
          p_page_size: number
          p_search?: string
          p_sort?: string
        }
        Returns: {
          bill: Json
          billing_party_company_name: string
          billing_party_name: string
          result_count: number
          result_total: number
        }[]
      }
      update_bill: {
        Args: {
          p_advance_amount: number
          p_airport_parking: number
          p_base_amount: number
          p_base_hours: number
          p_base_km: number
          p_base_package: string
          p_bill_id: string
          p_billing_party_id: string
          p_closing_date: string
          p_closing_kilometer: number
          p_closing_time: string
          p_company_id: string
          p_driver_id: string
          p_driver_name: string
          p_extra_hour_rate: number
          p_extra_km_rate: number
          p_fastag: number
          p_garage_time: string
          p_guest_id: string
          p_guest_name: string
          p_guest_salutation: string
          p_notes: string
          p_opening_kilometer: number
          p_pending_amount: number
          p_reporting_place: string
          p_reporting_time: string
          p_road_parking: number
          p_total_hours: number
          p_total_km: number
          p_trip_date: string
          p_vehicle_id: string
          p_vehicle_name: string
          p_vehicle_number: string
          p_whatsapp_number: string
        }
        Returns: {
          advance_amount: number | null
          airport_parking: number | null
          balance_amount: number | null
          base_amount: number | null
          base_hours: number | null
          base_km: number | null
          base_package: string | null
          billing_party_id: string | null
          client_request_id: string | null
          closing_date: string | null
          closing_kilometer: number | null
          closing_time: string | null
          company_id: string | null
          created_at: string
          customer_name: string | null
          date: string | null
          driver_id: string | null
          driver_name: string | null
          end_location: string | null
          extra_hour_amount: number | null
          extra_hour_rate: number | null
          extra_hours: number | null
          extra_km: number | null
          extra_km_amount: number | null
          extra_km_rate: number | null
          fastag: number | null
          garage_time: string | null
          guest_id: string | null
          guest_name: string | null
          guest_salutation: string | null
          id: string
          kilometer_amount: number | null
          night_charges: number | null
          notes: string | null
          opening_kilometer: number | null
          organization_id: string
          other_charges: number | null
          parking_charges: number | null
          passenger_name: string | null
          pending_amount: number | null
          permit_charges: number | null
          rate_per_kilometer: number | null
          remarks: string | null
          reporting_place: string | null
          reporting_time: string | null
          road_parking: number | null
          start_location: string | null
          title_prefix: string | null
          toll_charges: number | null
          total_amount: number | null
          total_hours: number | null
          total_kilometers: number | null
          total_km: number | null
          trip_date: string | null
          updated_at: string
          user_id: string
          vehicle_id: string | null
          vehicle_name: string | null
          vehicle_number: string | null
          whatsapp_number: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      organization_business_type: "individual_driver" | "vendor"
      organization_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      organization_business_type: ["individual_driver", "vendor"],
      organization_role: ["owner", "admin", "member"],
    },
  },
} as const
