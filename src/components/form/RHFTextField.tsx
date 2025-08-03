import { Controller, useFormContext } from 'react-hook-form';
import TextField, { TextFieldProps } from '@mui/material/TextField';

type Props = TextFieldProps & { name: string };

export default function RHFTextField({ name, ...rest }: Props) {
  const {
    control,
    formState: { errors },
  } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      defaultValue=""
      render={({ field }) => (
        <TextField
          {...field}
          {...rest}
          error={!!errors[name]}
          helperText={errors[name]?.message as string}
          fullWidth
        />
      )}
    />
  );
}
